import { prisma } from "../src/lib/prisma";

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@localhost" },
    update: {},
    create: {
      email: "admin@localhost",
      password: "demo-password",
      name: "Admin",
      role: "ADMIN",
      profile: {
        create: {
          headline: "Platform Administrator",
          bio: "LMS platform admin account.",
        },
      },
    },
  });

  const coach = await prisma.user.upsert({
    where: { email: "coach@localhost" },
    update: {},
    create: {
      email: "coach@localhost",
      password: "demo-password",
      name: "Coach Kim",
      role: "COACH",
      profile: {
        create: {
          headline: "Full-stack Instructor",
          bio: "Next.js and Prisma specialist.",
        },
      },
    },
  });

  const student = await prisma.user.upsert({
    where: { email: "demo@localhost" },
    update: {},
    create: {
      email: "demo@localhost",
      password: "demo-password",
      name: "Demo User",
      role: "USER",
      profile: {
        create: {
          headline: "Aspiring Developer",
        },
      },
    },
  });

  await prisma.user.upsert({
    where: { email: "customer@localhost" },
    update: {},
    create: {
      email: "customer@localhost",
      password: "demo-password",
      name: "New Customer",
      role: "USER",
      profile: {
        create: {
          headline: "Just getting started",
        },
      },
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "glia-academy" },
    update: {},
    create: {
      name: "Glia Academy",
      slug: "glia-academy",
      description: "Premium online learning platform",
      members: {
        create: [
          { userId: admin.id, role: "OWNER" },
          { userId: coach.id, role: "ADMIN" },
        ],
      },
    },
  });

  const category = await prisma.category.upsert({
    where: { slug: "web-development" },
    update: {},
    create: {
      name: "Web Development",
      slug: "web-development",
      description: "Frontend and backend courses",
    },
  });

  const tag = await prisma.tag.upsert({
    where: { slug: "nextjs" },
    update: {},
    create: {
      name: "Next.js",
      slug: "nextjs",
    },
  });

  const course = await prisma.course.upsert({
    where: { slug: "nextjs-fundamentals" },
    update: { price: 99000 },
    create: {
      title: "Next.js Fundamentals",
      slug: "nextjs-fundamentals",
      description: "Learn App Router, Server Components, and data fetching.",
      instructorId: coach.id,
      organizationId: organization.id,
      status: "PUBLISHED",
      level: "BEGINNER",
      price: 99000,
      isFeatured: true,
      publishedAt: new Date(),
      categories: {
        create: [{ categoryId: category.id }],
      },
      tags: {
        create: [{ tagId: tag.id }],
      },
      modules: {
        create: [
          {
            title: "Getting Started",
            order: 1,
            lessons: {
              create: [
                {
                  title: "Welcome to Next.js",
                  type: "VIDEO",
                  order: 1,
                  duration: 12,
                  isFree: true,
                  contents: {
                    create: [
                      {
                        type: "VIDEO",
                        title: "Introduction",
                        url: "https://example.com/videos/intro.mp4",
                        order: 1,
                      },
                    ],
                  },
                },
                {
                  title: "Setup & Project Structure",
                  type: "TEXT",
                  order: 2,
                  duration: 8,
                  contents: {
                    create: [
                      {
                        type: "HTML",
                        body: "<p>Initialize a Next.js project with App Router.</p>",
                        order: 1,
                      },
                    ],
                  },
                },
              ],
            },
          },
          {
            title: "Assessment",
            order: 2,
            lessons: {
              create: [
                {
                  title: "Module Quiz",
                  type: "QUIZ",
                  order: 1,
                  quiz: {
                    create: {
                      title: "Next.js Basics Quiz",
                      passingScore: 70,
                      questions: {
                        create: [
                          {
                            prompt: "Which folder is used for App Router pages?",
                            type: "SINGLE_CHOICE",
                            order: 1,
                            options: {
                              create: [
                                { label: "pages/", order: 1 },
                                { label: "app/", order: 2, isCorrect: true },
                                { label: "src/routes/", order: 3 },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                {
                  title: "Build a Landing Page",
                  type: "ASSIGNMENT",
                  order: 2,
                  assignment: {
                    create: {
                      title: "Landing Page Assignment",
                      description: "Create a responsive landing page with Tailwind CSS.",
                      maxScore: 100,
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      modules: {
        include: {
          lessons: true,
        },
      },
    },
  });

  const bundleCoachingOffering = await prisma.coachingOffering.upsert({
    where: { slug: "nextjs-coaching-2sessions" },
    update: {},
    create: {
      title: "Next.js 1:1 코칭 2회",
      slug: "nextjs-coaching-2sessions",
      description: "Zoom 기반 1:1 라이브 코칭 (회당 30분, 30일 이내 사용)",
      deliveryMode: "LIVE",
      totalSessions: 2,
      validDays: 30,
      sessionMinutes: 30,
      coachId: coach.id,
      courseId: course.id,
      cancelPolicy: { cancelBeforeHours: 24, countReservedAsUsed: true },
      refundPolicy: { fullRefundDays: 7, requiresNoReservations: true },
    },
  });

  const standaloneCoachingOffering = await prisma.coachingOffering.upsert({
    where: { slug: "coaching-3sessions-standalone" },
    update: {},
    create: {
      title: "1:1 코칭 3회권",
      slug: "coaching-3sessions-standalone",
      description: "코스 없이 구매 가능한 범용 코칭 3회권",
      deliveryMode: "LIVE",
      totalSessions: 3,
      validDays: 30,
      sessionMinutes: 30,
      coachId: coach.id,
      cancelPolicy: { cancelBeforeHours: 24 },
      refundPolicy: { fullRefundDays: 7 },
    },
  });

  const courseOnlyProduct = await prisma.product.upsert({
    where: { slug: "nextjs-vod-only" },
    update: {},
    create: {
      slug: "nextjs-vod-only",
      title: "Next.js Fundamentals (VOD)",
      description: "동영상 강의만 포함",
      kind: "COURSE_ONLY",
      listPrice: 99000,
      organizationId: organization.id,
      publishedAt: new Date(),
      items: {
        create: [
          {
            kind: "COURSE_ACCESS",
            courseId: course.id,
            sortOrder: 1,
          },
        ],
      },
    },
    include: { items: true },
  });

  const coachingOnlyProduct = await prisma.product.upsert({
    where: { slug: "coaching-3sessions" },
    update: {},
    create: {
      slug: "coaching-3sessions",
      title: "1:1 코칭 3회권",
      description: "코스 없이 코칭만 구매",
      kind: "COACHING_ONLY",
      listPrice: 200000,
      organizationId: organization.id,
      publishedAt: new Date(),
      items: {
        create: [
          {
            kind: "COACHING_ACCESS",
            coachingOfferingId: standaloneCoachingOffering.id,
            sortOrder: 1,
          },
        ],
      },
    },
    include: { items: true },
  });

  const bundleProduct = await prisma.product.upsert({
    where: { slug: "nextjs-vod-coaching-bundle" },
    update: {},
    create: {
      slug: "nextjs-vod-coaching-bundle",
      title: "Next.js VOD + 코칭 2회 패키지",
      description: "강의와 1:1 코칭 2회가 포함된 번들",
      kind: "BUNDLE",
      listPrice: 299000,
      salePrice: 220000,
      organizationId: organization.id,
      publishedAt: new Date(),
      items: {
        create: [
          {
            kind: "COURSE_ACCESS",
            courseId: course.id,
            sortOrder: 1,
          },
          {
            kind: "COACHING_ACCESS",
            coachingOfferingId: bundleCoachingOffering.id,
            sortOrder: 2,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Bundle purchase via Order → Fulfillment → EntitlementGrant
  const bundlePrice = bundleProduct.salePrice ?? bundleProduct.listPrice;
  const now = new Date();
  const validUntil = addDays(now, bundleCoachingOffering.validDays);

  const existingOrder = await prisma.order.findFirst({
    where: {
      userId: student.id,
      idempotencyKey: "seed-bundle-order-v1",
    },
    include: {
      fulfillments: { include: { grants: true } },
    },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        userId: student.id,
        status: "PAID",
        subtotal: bundlePrice,
        total: bundlePrice,
        idempotencyKey: "seed-bundle-order-v1",
        paidAt: now,
        lines: {
          create: {
            productId: bundleProduct.id,
            unitPrice: bundlePrice,
            lineTotal: bundlePrice,
          },
        },
        payments: {
          create: {
            provider: "demo",
            providerRef: "seed-payment-bundle-v1",
            amount: bundlePrice,
            status: "SUCCEEDED",
            paidAt: now,
          },
        },
      },
      include: { lines: true },
    });

    const orderLine = order.lines[0];
    if (!orderLine) {
      throw new Error("Order line missing for bundle seed.");
    }

    const fulfillment = await prisma.fulfillment.create({
      data: {
        orderId: order.id,
        status: "COMPLETED",
        fulfilledAt: now,
      },
    });

    let enrollmentId: string | null = null;

    for (const item of bundleProduct.items) {
      if (item.kind === "COURSE_ACCESS" && item.courseId) {
        const enrollment = await prisma.enrollment.upsert({
          where: {
            userId_courseId: {
              userId: student.id,
              courseId: item.courseId,
            },
          },
          update: {},
          create: {
            userId: student.id,
            courseId: item.courseId,
            status: "ACTIVE",
            progressPercent: 25,
            lastAccessedAt: now,
          },
        });
        enrollmentId = enrollment.id;

        const firstLesson = course.modules[0]?.lessons[0];
        if (firstLesson) {
          await prisma.lessonProgress.upsert({
            where: {
              enrollmentId_lessonId: {
                enrollmentId: enrollment.id,
                lessonId: firstLesson.id,
              },
            },
            update: {},
            create: {
              enrollmentId: enrollment.id,
              lessonId: firstLesson.id,
              status: "COMPLETED",
              watchedSeconds: 720,
              completedAt: now,
            },
          });
        }

        await prisma.entitlementGrant.create({
          data: {
            fulfillmentId: fulfillment.id,
            orderLineId: orderLine.id,
            productItemId: item.id,
            grantType: "COURSE",
            enrollmentId: enrollment.id,
          },
        });
      }

      if (item.kind === "COACHING_ACCESS" && item.coachingOfferingId) {
        const offering = bundleCoachingOffering;
        const entitlement = await prisma.coachingEntitlement.create({
          data: {
            userId: student.id,
            coachingOfferingId: item.coachingOfferingId,
            coachId: offering.coachId,
            courseId: offering.courseId,
            enrollmentId: enrollmentId ?? undefined,
            totalSessions: offering.totalSessions,
            validFrom: now,
            validUntil,
            status: "ACTIVE",
          },
        });

        await prisma.entitlementGrant.create({
          data: {
            fulfillmentId: fulfillment.id,
            orderLineId: orderLine.id,
            productItemId: item.id,
            grantType: "COACHING",
            coachingEntitlementId: entitlement.id,
          },
        });

        const sessionAt = addDays(now, 3);
        sessionAt.setHours(14, 0, 0, 0);

        const session = await prisma.coachingSession.create({
          data: {
            entitlementId: entitlement.id,
            coachId: coach.id,
            userId: student.id,
            sessionNo: 1,
            status: "CONFIRMED",
            scheduledAt: sessionAt,
            durationMinutes: offering.sessionMinutes,
            meetingProvider: "zoom",
            meetingUrl: "https://zoom.us/j/demo-session",
          },
        });

        await prisma.coachingEntitlement.update({
          where: { id: entitlement.id },
          data: { reservedSessions: 1 },
        });

        await prisma.coachingIntake.create({
          data: {
            entitlementId: entitlement.id,
            sessionId: session.id,
            answers: {
              goal: "App Router 프로젝트 구조 점검",
              blockers: "Server/Client Component 경계",
            },
          },
        });

        await prisma.coachingSessionEvent.create({
          data: {
            sessionId: session.id,
            actorId: student.id,
            toStatus: "CONFIRMED",
            note: "Seed: initial booking",
          },
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        entityType: "Fulfillment",
        entityId: fulfillment.id,
        action: "FULFILL_COMPLETED",
        metadata: {
          orderId: order.id,
          productSlug: bundleProduct.slug,
        },
      },
    });
  }

  await prisma.review.upsert({
    where: {
      courseId_userId: {
        courseId: course.id,
        userId: student.id,
      },
    },
    update: {},
    create: {
      courseId: course.id,
      userId: student.id,
      rating: 5,
      comment: "Clear structure and great examples!",
    },
  });

  await seedDailyCheckInForm(admin.id, organization.id);
  await seedWeeklyCheckInForm(admin.id, organization.id);

  console.log("High-end LMS seed completed.");
  console.log(`Products: ${courseOnlyProduct.slug}, ${coachingOnlyProduct.slug}, ${bundleProduct.slug}`);
}

async function seedDailyCheckInForm(adminId: string, organizationId: string) {
  const moodOptions = [
    { label: "매우 나쁨", emoji: "😖", order: 1 },
    { label: "나쁨", emoji: "😕", order: 2 },
    { label: "보통", emoji: "😐", order: 3 },
    { label: "좋음", emoji: "🙂", order: 4 },
    { label: "매우 좋음", emoji: "😌", order: 5 },
  ];

  const form = await prisma.form.upsert({
    where: { slug: "daily-checkin" },
    update: {
      title: "오늘의 체크인",
      description: "매일 아침 상태를 기록하는 데일리 체크인",
      purpose: "DAILY_CHECKIN",
      schedule: "DAILY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      organizationId,
    },
    create: {
      slug: "daily-checkin",
      title: "오늘의 체크인",
      description: "매일 아침 상태를 기록하는 데일리 체크인",
      purpose: "DAILY_CHECKIN",
      schedule: "DAILY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      timezone: "Asia/Seoul",
      createdById: adminId,
      organizationId,
    },
  });

  await prisma.formQuestion.deleteMany({ where: { formId: form.id } });

  const questions = [
    {
      prompt: "Q1. 지난밤 수면은 어땠나요?",
      type: "SINGLE_CHOICE" as const,
      order: 1,
      options: moodOptions,
    },
    {
      prompt: "Q2. 지금 내 신경계 상태는?",
      type: "SINGLE_CHOICE" as const,
      order: 2,
      options: moodOptions,
    },
    {
      prompt: "Q3. 어제의 숨·움직임 숙제는?",
      type: "SINGLE_CHOICE" as const,
      order: 3,
      options: [
        { label: "했어요", value: "done", order: 1 },
        { label: "조금 했어요", value: "partial", order: 2 },
        { label: "못 했어요", value: "none", order: 3 },
      ],
    },
    {
      prompt: "Q4. 어젯밤, 밤 10시~새벽 2시 사이에 잠들어 있었나요?",
      type: "YES_NO" as const,
      order: 4,
      options: [
        { label: "예", value: "yes", order: 1 },
        { label: "아니오", value: "no", order: 2 },
      ],
    },
    {
      prompt: "한 줄 메모 남기기 (선택)",
      type: "SHORT_TEXT" as const,
      order: 5,
      isRequired: false,
      options: [] as Array<{ label: string; value?: string; emoji?: string; order: number }>,
    },
  ];

  for (const question of questions) {
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
                emoji: "emoji" in option ? option.emoji : undefined,
                value: "value" in option ? option.value : undefined,
                order: option.order,
              })),
            }
          : undefined,
      },
    });
  }
}

async function seedWeeklyCheckInForm(adminId: string, organizationId: string) {
  const moodOptions = [
    { label: "매우 나쁨", emoji: "😖", order: 1 },
    { label: "나쁨", emoji: "😕", order: 2 },
    { label: "보통", emoji: "😐", order: 3 },
    { label: "좋음", emoji: "🙂", order: 4 },
    { label: "매우 좋음", emoji: "😌", order: 5 },
  ];

  const form = await prisma.form.upsert({
    where: { slug: "weekly-checkin" },
    update: {
      title: "주간 체크인",
      description: "매주 일요일, 한 주를 돌아보는 주간 체크인",
      purpose: "WEEKLY_CHECKIN",
      schedule: "WEEKLY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      organizationId,
    },
    create: {
      slug: "weekly-checkin",
      title: "주간 체크인",
      description: "매주 일요일, 한 주를 돌아보는 주간 체크인",
      purpose: "WEEKLY_CHECKIN",
      schedule: "WEEKLY",
      status: "PUBLISHED",
      publishedAt: new Date(),
      timezone: "Asia/Seoul",
      createdById: adminId,
      organizationId,
    },
  });

  await prisma.formQuestion.deleteMany({ where: { formId: form.id } });

  const questions = [
    {
      prompt: "Q1. 이번 주 전반적인 컨디션은?",
      type: "SINGLE_CHOICE" as const,
      order: 1,
      options: moodOptions,
    },
    {
      prompt: "Q2. 이번 주 수면·호흡·움직임 실천은?",
      type: "SINGLE_CHOICE" as const,
      order: 2,
      options: [
        { label: "대부분 지켰어요", value: "mostly", order: 1 },
        { label: "절반 정도", value: "half", order: 2 },
        { label: "거의 못했어요", value: "rarely", order: 3 },
      ],
    },
    {
      prompt: "Q3. 이번 주 스트레스 수준은?",
      type: "SINGLE_CHOICE" as const,
      order: 3,
      options: [
        { label: "매우 높음", emoji: "😰", order: 1 },
        { label: "높음", emoji: "😟", order: 2 },
        { label: "보통", emoji: "😐", order: 3 },
        { label: "낮음", emoji: "🙂", order: 4 },
        { label: "매우 낮음", emoji: "😌", order: 5 },
      ],
    },
    {
      prompt: "Q4. 이번 주 가장 잘 지킨 습관은?",
      type: "SHORT_TEXT" as const,
      order: 4,
      options: [] as Array<{ label: string; value?: string; emoji?: string; order: number }>,
    },
    {
      prompt: "Q5. 다음 주에 개선하고 싶은 점은?",
      type: "SHORT_TEXT" as const,
      order: 5,
      options: [] as Array<{ label: string; value?: string; emoji?: string; order: number }>,
    },
    {
      prompt: "Q6. 이번 주 목표 달성도는?",
      type: "SINGLE_CHOICE" as const,
      order: 6,
      options: [
        { label: "100% 달성", value: "100", order: 1 },
        { label: "70% 이상", value: "70", order: 2 },
        { label: "50% 정도", value: "50", order: 3 },
        { label: "50% 미만", value: "below50", order: 4 },
      ],
    },
  ];

  for (const question of questions) {
    await prisma.formQuestion.create({
      data: {
        formId: form.id,
        prompt: question.prompt,
        type: question.type,
        order: question.order,
        isRequired: true,
        options: question.options.length
          ? {
              create: question.options.map((option) => ({
                label: option.label,
                emoji: "emoji" in option ? option.emoji : undefined,
                value: "value" in option ? option.value : undefined,
                order: option.order,
              })),
            }
          : undefined,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
