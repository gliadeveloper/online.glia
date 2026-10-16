// Verifies a paid option grants only that product's course and coaching.
// Uses the app database. Creates prefixed rows and deletes them before exit.
import dotenv from "dotenv";
import assert from "node:assert/strict";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { postgresUtcConfig } from "../src/lib/postgres-utc.ts";

const stamp = `pggrant${Date.now()}`;
const pool = new Pool(postgresUtcConfig({ connectionString: process.env.DATABASE_URL, max: 2 }));
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ids = {
  coachId: "",
  buyerId: "",
  morningCourseId: "",
  eveningCourseId: "",
  morningOfferingId: "",
  eveningOfferingId: "",
  morningProductId: "",
  eveningProductId: "",
  groupId: "",
  orderId: "",
};

async function cleanup() {
  if (ids.orderId) {
    await prisma.order.delete({ where: { id: ids.orderId } }).catch(() => undefined);
  }
  if (ids.buyerId) {
    await prisma.coachingEntitlement.deleteMany({ where: { userId: ids.buyerId } });
    await prisma.enrollment.deleteMany({ where: { userId: ids.buyerId } });
  }
  if (ids.groupId) {
    await prisma.productGroup.delete({ where: { id: ids.groupId } }).catch(() => undefined);
  }
  const productIds = [ids.morningProductId, ids.eveningProductId].filter(Boolean);
  if (productIds.length) {
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  }
  const offeringIds = [ids.morningOfferingId, ids.eveningOfferingId].filter(Boolean);
  if (offeringIds.length) {
    await prisma.coachingOffering.deleteMany({ where: { id: { in: offeringIds } } });
  }
  const courseIds = [ids.morningCourseId, ids.eveningCourseId].filter(Boolean);
  if (courseIds.length) {
    await prisma.course.deleteMany({ where: { id: { in: courseIds } } });
  }
  const userIds = [ids.buyerId, ids.coachId].filter(Boolean);
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const coach = await prisma.user.create({
    data: { email: `${stamp}-coach@example.com`, name: "옵션 검증 코치", role: "COACH" },
  });
  ids.coachId = coach.id;
  const buyer = await prisma.user.create({
    data: { email: `${stamp}-buyer@example.com`, name: "옵션 검증 회원", role: "USER" },
  });
  ids.buyerId = buyer.id;

  const morningCourse = await prisma.course.create({
    data: { title: `${stamp} 오전반`, instructorId: coach.id, status: "PUBLISHED" },
  });
  ids.morningCourseId = morningCourse.id;
  const eveningCourse = await prisma.course.create({
    data: { title: `${stamp} 저녁반`, instructorId: coach.id, status: "PUBLISHED" },
  });
  ids.eveningCourseId = eveningCourse.id;

  const morningOffering = await prisma.coachingOffering.create({
    data: {
      title: `${stamp} 코칭 2회`,
      slug: `${stamp}-morning`,
      totalSessions: 2,
      validDays: 30,
      coachId: coach.id,
    },
  });
  ids.morningOfferingId = morningOffering.id;
  const eveningOffering = await prisma.coachingOffering.create({
    data: {
      title: `${stamp} 코칭 3회`,
      slug: `${stamp}-evening`,
      totalSessions: 3,
      validDays: 30,
      coachId: coach.id,
    },
  });
  ids.eveningOfferingId = eveningOffering.id;

  const morningProduct = await prisma.product.create({
    data: {
      title: `${stamp} 오전반 상품`,
      kind: "BUNDLE",
      listPrice: 100000,
      isActive: true,
      items: {
        create: [
          { kind: "COURSE_ACCESS", courseId: morningCourse.id, sortOrder: 1 },
          { kind: "COACHING_ACCESS", coachingOfferingId: morningOffering.id, sortOrder: 2 },
        ],
      },
    },
  });
  ids.morningProductId = morningProduct.id;
  const eveningProduct = await prisma.product.create({
    data: {
      title: `${stamp} 저녁반 상품`,
      kind: "BUNDLE",
      listPrice: 120000,
      isActive: true,
      items: {
        create: [
          { kind: "COURSE_ACCESS", courseId: eveningCourse.id, sortOrder: 1 },
          { kind: "COACHING_ACCESS", coachingOfferingId: eveningOffering.id, sortOrder: 2 },
        ],
      },
    },
  });
  ids.eveningProductId = eveningProduct.id;

  const group = await prisma.productGroup.create({
    data: {
      title: `${stamp} 생활습관`,
      isActive: true,
      publishedAt: new Date(),
      members: {
        create: [
          { productId: morningProduct.id, label: "오전반", sortOrder: 0 },
          { productId: eveningProduct.id, label: "저녁반", sortOrder: 1 },
        ],
      },
    },
  });
  ids.groupId = group.id;

  const { checkout } = await import("../src/lib/fulfillment.ts");
  const order = await checkout({
    userId: buyer.id,
    productId: morningProduct.id,
    idempotencyKey: `${stamp}-pay`,
  });
  ids.orderId = order.id;

  assert.equal(order.lines.length, 1);
  assert.equal(order.lines[0]?.productId, morningProduct.id);
  assert.equal(order.status, "PAID");

  const enrollments = await prisma.enrollment.findMany({ where: { userId: buyer.id } });
  assert.deepEqual(enrollments.map((row) => row.courseId), [morningCourse.id]);

  const entitlements = await prisma.coachingEntitlement.findMany({ where: { userId: buyer.id } });
  assert.equal(entitlements.length, 1);
  assert.equal(entitlements[0]?.coachingOfferingId, morningOffering.id);
  assert.equal(entitlements[0]?.totalSessions, 2);
  assert.equal(entitlements[0]?.courseId, null);

  const sessions = await prisma.coachingSession.findMany({
    where: { entitlementId: entitlements[0].id },
    orderBy: { sessionNo: "asc" },
  });
  assert.deepEqual(sessions.map((session) => session.sessionNo), [1, 2]);

  const eveningEnrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId: buyer.id, courseId: eveningCourse.id } },
  });
  assert.equal(eveningEnrollment, null);
  const eveningEntitlement = await prisma.coachingEntitlement.findFirst({
    where: { userId: buyer.id, coachingOfferingId: eveningOffering.id },
  });
  assert.equal(eveningEntitlement, null);

  console.log("paid option granted the morning course and 2 coaching sessions only");
}

try {
  await main();
} finally {
  await cleanup();
  await prisma.$disconnect();
  await pool.end();
}
