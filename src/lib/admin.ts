import { redirect } from "next/navigation";

import { getCheckInDate, getWeekPeriodKey } from "@/lib/forms";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return user;
}

export async function getAdminOverview() {
  const timezone = "Asia/Seoul";
  const today = getCheckInDate(timezone);
  const weekKey = getWeekPeriodKey(timezone);

  const checkInFormIds = await prisma.form.findMany({
    where: {
      purpose: { in: ["DAILY_CHECKIN", "WEEKLY_CHECKIN"] },
      status: "PUBLISHED",
    },
    select: { id: true, slug: true, purpose: true, schedule: true },
  });

  const dailyForm = checkInFormIds.find((form) => form.purpose === "DAILY_CHECKIN");
  const weeklyForm = checkInFormIds.find((form) => form.purpose === "WEEKLY_CHECKIN");

  const [
    userCount,
    customerCount,
    coachCount,
    orderCount,
    paidOrders,
    revenueAgg,
    formCount,
    publishedForms,
    draftForms,
    productCount,
    activeProducts,
    courseCount,
    publishedCourses,
    upcomingSessions,
    todayDailyCount,
    todayWeeklyCount,
    totalSubmissions,
    recentSubmissions,
    recentOrders,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "COACH" } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.order.aggregate({
      where: { status: "PAID" },
      _sum: { total: true },
    }),
    prisma.form.count(),
    prisma.form.count({ where: { status: "PUBLISHED" } }),
    prisma.form.count({ where: { status: "DRAFT" } }),
    prisma.product.count(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.course.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.coachingSession.count({
      where: {
        publicationStatus: { not: "PUBLISHED" },
        scheduledAt: { gte: new Date() },
      },
    }),
    dailyForm
      ? prisma.formSubmission.count({
          where: { formId: dailyForm.id, checkInDate: today },
        })
      : Promise.resolve(0),
    weeklyForm
      ? prisma.formSubmission.count({
          where: { formId: weeklyForm.id, checkInDate: weekKey },
        })
      : Promise.resolve(0),
    prisma.formSubmission.count(),
    prisma.formSubmission.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: {
        user: { select: { id: true, name: true, email: true } },
        form: { select: { id: true, slug: true, title: true, purpose: true } },
      },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        user: { select: { id: true, name: true, email: true } },
        lines: {
          include: {
            product: { select: { title: true, slug: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    timezone,
    today,
    weekKey,
    stats: {
      users: userCount,
      customers: customerCount,
      coaches: coachCount,
      orders: orderCount,
      paidOrders,
      revenue: revenueAgg._sum.total ?? 0,
      forms: formCount,
      publishedForms,
      draftForms,
      products: productCount,
      activeProducts,
      courses: courseCount,
      publishedCourses,
      upcomingSessions,
      todayDailyCount,
      todayWeeklyCount,
      totalSubmissions,
    },
    checkInForms: { dailyForm, weeklyForm },
    recentSubmissions,
    recentOrders,
    recentAuditLogs,
  };
}

export const purposeLabels: Record<string, string> = {
  DAILY_CHECKIN: "데일리 체크인",
  WEEKLY_CHECKIN: "주간 체크인",
  SURVEY: "설문",
  INTAKE: "인테이크",
};

export const scheduleLabels: Record<string, string> = {
  ONCE: "1회",
  DAILY: "매일",
  WEEKLY: "매주",
};

export const statusLabels: Record<string, string> = {
  DRAFT: "초안",
  PUBLISHED: "발행됨",
  ARCHIVED: "보관됨",
};

export function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
