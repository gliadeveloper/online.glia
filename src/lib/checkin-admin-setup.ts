import {
  CHECKIN_FORM_SLUGS,
  CHECKIN_FORM_TEMPLATES,
  type CheckInFormKind,
} from "@/lib/checkin-form-templates";
import { formDetailInclude } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

export type CheckInFormSetupItem = {
  kind: CheckInFormKind;
  slug: string;
  title: string;
  formId: string | null;
  status: "MISSING" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  questionCount: number;
  isReady: boolean;
};

export async function getCheckInFormsSetupStatus(): Promise<CheckInFormSetupItem[]> {
  const slugs = Object.values(CHECKIN_FORM_SLUGS);
  const forms = await prisma.form.findMany({
    where: { slug: { in: slugs } },
    include: {
      _count: { select: { questions: true } },
    },
  });

  const formBySlug = new Map(forms.map((form) => [form.slug, form]));

  return (Object.keys(CHECKIN_FORM_TEMPLATES) as CheckInFormKind[]).map((kind) => {
    const template = CHECKIN_FORM_TEMPLATES[kind];
    const form = formBySlug.get(template.slug);

    if (!form) {
      return {
        kind,
        slug: template.slug,
        title: template.title,
        formId: null,
        status: "MISSING" as const,
        questionCount: 0,
        isReady: false,
      };
    }

    const status =
      form.status === "PUBLISHED"
        ? ("PUBLISHED" as const)
        : form.status === "ARCHIVED"
          ? ("ARCHIVED" as const)
          : ("DRAFT" as const);

    return {
      kind,
      slug: template.slug,
      title: form.title,
      formId: form.id,
      status,
      questionCount: form._count.questions,
      isReady: form.status === "PUBLISHED" && form._count.questions > 0,
    };
  });
}

export async function upsertCheckInFormFromTemplate(params: {
  kind: CheckInFormKind;
  createdById: string;
  organizationId?: string | null;
}) {
  const template = CHECKIN_FORM_TEMPLATES[params.kind];

  const form = await prisma.form.upsert({
    where: { slug: template.slug },
    update: {
      title: template.title,
      description: template.description,
      purpose: template.purpose,
      schedule: template.schedule,
      status: "PUBLISHED",
      publishedAt: new Date(),
      timezone: "Asia/Seoul",
      organizationId: params.organizationId ?? undefined,
    },
    create: {
      slug: template.slug,
      title: template.title,
      description: template.description,
      purpose: template.purpose,
      schedule: template.schedule,
      status: "PUBLISHED",
      publishedAt: new Date(),
      timezone: "Asia/Seoul",
      createdById: params.createdById,
      organizationId: params.organizationId ?? undefined,
    },
  });

  await prisma.formQuestion.deleteMany({ where: { formId: form.id } });

  for (const question of template.questions) {
    await prisma.formQuestion.create({
      data: {
        formId: form.id,
        prompt: question.prompt,
        type: question.type,
        order: question.order,
        isRequired: question.isRequired ?? true,
        options: question.options.length
          ? {
              create: question.options.map((option) => ({
                label: option.label,
                emoji: option.emoji,
                value: option.value,
                order: option.order,
              })),
            }
          : undefined,
      },
    });
  }

  return prisma.form.findUniqueOrThrow({
    where: { id: form.id },
    include: formDetailInclude,
  });
}
