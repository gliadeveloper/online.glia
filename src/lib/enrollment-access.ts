import type {
  AccessDurationKind,
  Enrollment,
  EnrollmentStatus,
} from "@/generated/prisma/client";

import { addDays } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export type CourseAccessPolicy = {
  accessDuration: AccessDurationKind;
  accessDays: number | null;
};

export type EnrollmentAccessFields = Pick<
  Enrollment,
  | "id"
  | "status"
  | "validFrom"
  | "validUntil"
  | "accessDuration"
  | "accessDays"
  | "progressPercent"
  | "completedAt"
  | "expiredAt"
>;

type ProductItemAccessSource = {
  accessDuration: AccessDurationKind;
  accessDays: number | null;
  course: {
    defaultAccessDuration: AccessDurationKind;
    defaultAccessDays: number | null;
  } | null;
};

type CourseDefaultSource = {
  defaultAccessDuration: AccessDurationKind;
  defaultAccessDays: number | null;
};

export function resolveCourseAccessPolicyFromProductItem(
  item: ProductItemAccessSource,
): CourseAccessPolicy {
  if (item.accessDuration === "FIXED_DAYS") {
    if (!item.accessDays || item.accessDays <= 0) {
      throw new Error("PRODUCT_ITEM_ACCESS_DAYS_REQUIRED");
    }
    return { accessDuration: "FIXED_DAYS", accessDays: item.accessDays };
  }

  if (item.course) {
    return resolveCourseAccessPolicyFromCourse(item.course);
  }

  return { accessDuration: "LIFETIME", accessDays: null };
}

export function resolveCourseAccessPolicyFromCourse(course: CourseDefaultSource): CourseAccessPolicy {
  if (course.defaultAccessDuration === "FIXED_DAYS") {
    if (!course.defaultAccessDays || course.defaultAccessDays <= 0) {
      throw new Error("COURSE_DEFAULT_ACCESS_DAYS_REQUIRED");
    }
    return { accessDuration: "FIXED_DAYS", accessDays: course.defaultAccessDays };
  }

  return { accessDuration: "LIFETIME", accessDays: null };
}

export function computeValidUntil(from: Date, policy: CourseAccessPolicy): Date | null {
  if (policy.accessDuration === "LIFETIME") {
    return null;
  }

  if (!policy.accessDays || policy.accessDays <= 0) {
    throw new Error("ACCESS_DAYS_REQUIRED");
  }

  return addDays(from, policy.accessDays);
}

export function canAccessEnrollment(
  enrollment: EnrollmentAccessFields,
  now: Date = new Date(),
): boolean {
  if (enrollment.status === "DROPPED" || enrollment.status === "SUSPENDED") {
    return false;
  }

  if (enrollment.status === "EXPIRED") {
    return false;
  }

  if (enrollment.validUntil && now > enrollment.validUntil) {
    return false;
  }

  return true;
}

export function resolveEnrollmentProgressStatus(
  enrollment: Pick<Enrollment, "progressPercent" | "completedAt">,
  accessActive: boolean,
): EnrollmentStatus {
  if (!accessActive) {
    return "EXPIRED";
  }

  if (enrollment.progressPercent >= 100) {
    return "COMPLETED";
  }

  return "ACTIVE";
}

export type EnrollmentAccessSnapshot = {
  validFrom: Date;
  validUntil: Date | null;
  accessDuration: AccessDurationKind;
  accessDays: number | null;
  status: EnrollmentStatus;
  expiredAt: Date | null;
};

export function buildInitialEnrollmentAccess(params: {
  policy: CourseAccessPolicy;
  now: Date;
}): EnrollmentAccessSnapshot {
  return {
    validFrom: params.now,
    validUntil: computeValidUntil(params.now, params.policy),
    accessDuration: params.policy.accessDuration,
    accessDays: params.policy.accessDays,
    status: "ACTIVE",
    expiredAt: null,
  };
}

export function computeEnrollmentAccessGrant(params: {
  existing: EnrollmentAccessFields | null;
  policy: CourseAccessPolicy;
  now: Date;
}): EnrollmentAccessSnapshot {
  const { existing, policy, now } = params;

  if (!existing) {
    return buildInitialEnrollmentAccess({ policy, now });
  }

  return {
    ...mergeEnrollmentAccessRenewal(existing, policy, now),
    expiredAt: null,
  } as EnrollmentAccessSnapshot;
}

export function isAccessUpgrade(
  existing: EnrollmentAccessFields,
  policy: CourseAccessPolicy,
  now: Date = new Date(),
): boolean {
  if (!canAccessEnrollment(existing, now)) {
    return false;
  }

  return policy.accessDuration === "LIFETIME" && existing.accessDuration === "FIXED_DAYS";
}

export type CourseGrantAction = "grant" | "renew" | "upgrade" | "skip";

export function evaluateCourseGrantAction(params: {
  enrollment: EnrollmentAccessFields | null;
  policy: CourseAccessPolicy;
  now?: Date;
}): CourseGrantAction {
  const now = params.now ?? new Date();
  const { enrollment, policy } = params;

  if (!enrollment) {
    return "grant";
  }

  if (!canAccessEnrollment(enrollment, now)) {
    return "renew";
  }

  if (isAccessUpgrade(enrollment, policy, now)) {
    return "upgrade";
  }

  return "skip";
}

export function mergeEnrollmentAccessRenewal(
  existing: EnrollmentAccessFields,
  policy: CourseAccessPolicy,
  now: Date,
): Omit<EnrollmentAccessSnapshot, "expiredAt"> & { expiredAt: null } {
  const action = evaluateCourseGrantAction({ enrollment: existing, policy, now });

  if (action === "skip") {
    const accessActive = canAccessEnrollment(existing, now);
    return {
      validFrom: existing.validFrom,
      validUntil: existing.validUntil,
      accessDuration: existing.accessDuration,
      accessDays: existing.accessDays,
      expiredAt: null,
      status: resolveEnrollmentProgressStatus(existing, accessActive),
    };
  }

  return computeEnrollmentAccessRenewal(existing, policy, now);
}

export function computeEnrollmentAccessRenewal(
  existing: EnrollmentAccessFields,
  policy: CourseAccessPolicy,
  now: Date,
): Omit<EnrollmentAccessSnapshot, "expiredAt"> & { expiredAt: null } {
  if (policy.accessDuration === "LIFETIME") {
    const accessActive = true;
    return {
      validFrom: existing.validFrom,
      validUntil: null,
      accessDuration: "LIFETIME",
      accessDays: null,
      expiredAt: null,
      status: resolveEnrollmentProgressStatus(existing, accessActive),
    };
  }

  const days = policy.accessDays!;
  const base =
    existing.validUntil && existing.validUntil > now ? existing.validUntil : now;
  const validUntil = addDays(base, days);
  const accessActive = validUntil > now;

  return {
    validFrom: existing.status === "EXPIRED" || !existing.validUntil || existing.validUntil <= now
      ? now
      : existing.validFrom,
    validUntil,
    accessDuration: "FIXED_DAYS",
    accessDays: days,
    expiredAt: null,
    status: resolveEnrollmentProgressStatus(existing, accessActive),
  };
}

export async function materializeEnrollmentExpiry(
  enrollment: EnrollmentAccessFields,
  now: Date = new Date(),
): Promise<EnrollmentAccessFields> {
  if (enrollment.status === "DROPPED" || enrollment.status === "SUSPENDED") {
    return enrollment;
  }

  if (!enrollment.validUntil || enrollment.validUntil > now) {
    return enrollment;
  }

  if (enrollment.status === "EXPIRED" && enrollment.expiredAt) {
    return enrollment;
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      status: "EXPIRED",
      expiredAt: enrollment.expiredAt ?? now,
    },
    select: {
      id: true,
      status: true,
      validFrom: true,
      validUntil: true,
      accessDuration: true,
      accessDays: true,
      progressPercent: true,
      completedAt: true,
      expiredAt: true,
    },
  });

  return updated;
}

export function formatEnrollmentAccessSummary(
  enrollment: Pick<Enrollment, "accessDuration" | "validUntil" | "status">,
  now: Date = new Date(),
): string {
  if (enrollment.accessDuration === "LIFETIME" || !enrollment.validUntil) {
    return "평생 수강";
  }

  if (enrollment.status === "EXPIRED" || enrollment.validUntil <= now) {
    return "수강 기간 만료";
  }

  const msLeft = enrollment.validUntil.getTime() - now.getTime();
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    return "수강 기간 만료";
  }

  if (daysLeft === 1) {
    return "D-1";
  }

  return `D-${daysLeft}`;
}

export function formatEnrollmentAccessUntil(
  enrollment: Pick<Enrollment, "accessDuration" | "validUntil">,
): string | null {
  if (enrollment.accessDuration === "LIFETIME" || !enrollment.validUntil) {
    return null;
  }

  return enrollment.validUntil.toLocaleDateString("ko-KR");
}
