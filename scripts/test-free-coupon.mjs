// node --conditions=react-server --import tsx scripts/test-free-coupon.mjs
// Runs real pricing, coupon locking and fulfillment against an in-memory DB double.
// Transaction rollback here is simulated; PostgreSQL integration remains separate.
import assert from 'node:assert/strict';
import { couponDiscountWon } from '../src/lib/shop-coupon-math.ts';

const rule = { discountType: 'PERCENT', discountAmount: null, discountPercent: 100, maxDiscountAmount: null, minOrderAmount: 200 };
assert.equal(couponDiscountWon(rule, 199), 0);
assert.equal(couponDiscountWon(rule, 200), 200);
assert.equal(couponDiscountWon(rule, 1000), 1000);
assert.equal(couponDiscountWon({ ...rule, discountType: 'FIXED', discountAmount: 500 }, 200), 200);
assert.equal(couponDiscountWon({ ...rule, discountPercent: 75 }, 200), 0);
assert.equal(couponDiscountWon({ ...rule, discountPercent: 50 }, 200), 100);
assert.equal(couponDiscountWon({ ...rule, maxDiscountAmount: 100 }, 200), 100);
assert.equal(couponDiscountWon(rule, NaN), 0);

const product = { id: 'product', title: 'Test', kind: 'COURSE_ONLY', isActive: true, listPrice: 1000, salePrice: 200,
  items: [{ id: 'item', kind: 'COURSE_ACCESS', courseId: 'course', coachingOfferingId: null, accessDuration: 'LIFETIME', accessDays: null,
    course: { id: 'course', title: 'Course', defaultAccessDuration: 'LIFETIME', defaultAccessDays: null } }] };
let state;
let failGrant = false;
function reset(overrides = {}) {
  state = { issue: { id: 'issue', userId: 'buyer', ...rule, status: 'ISSUED', validStartsAt: new Date(0), expiresAt: new Date('2099-01-01'),
    coupon: { products: [{ productId: 'product' }] }, ...overrides }, orders: [], enrollments: [], grants: [], fulfillments: [], audits: [], coaching: [], sessions: [] };
}
reset();
const db = {
  product: { findFirst: async ({ where }) => where.id === product.id && product.isActive ? product : null },
  order: {
    findFirst: async ({ where }) => state.orders.find(o => Object.entries(where).every(([k, v]) => k === 'lines' ? o.lines.some(l => l.productId === v.some.productId) : o[k] === v)) ?? null,
    create: async ({ data }) => { const order = { ...data, id: 'order', lines: [{ ...data.lines.create, id: 'line' }] }; state.orders.push(order); return order; },
  },
  shopCouponIssue: {
    findFirst: async ({ where }) => state.issue.id === where.id && state.issue.userId === where.userId && where.status.in.includes(state.issue.status) ? structuredClone(state.issue) : null,
    updateMany: async ({ where, data }) => {
      const statusMatches = typeof where.status === 'string' ? state.issue.status === where.status : where.status.in.includes(state.issue.status);
      if (!statusMatches) return { count: 0 };
      Object.assign(state.issue, data); return { count: 1 };
    },
  },
  enrollment: {
    findMany: async () => state.enrollments,
    findUnique: async () => state.enrollments[0] ?? null,
    create: async ({ data }) => { const row = { ...data, id: 'enrollment' }; state.enrollments.push(row); return row; },
  },
  coachingEntitlement: {
    findMany: async () => [],
    create: async ({ data }) => { const row = { ...data, id: 'entitlement' }; state.coaching.push(row); return row; },
  },
  coachingOffering: { findUniqueOrThrow: async () => ({ id: 'offering', coachId: 'coach', totalSessions: 2, validDays: 30 }) },
  coachingOfferingSessionTemplate: { findMany: async () => [] },
  coachingSession: {
    findMany: async () => state.sessions,
    create: async ({ data }) => { const row = { ...data, id: `session-${data.sessionNo}` }; state.sessions.push(row); return row; },
  },
  coachingSessionConversation: { create: async ({ data }) => data },
  coachingSessionProgress: { create: async ({ data }) => data },
  fulfillment: { create: async ({ data }) => { const row = { ...data, id: 'fulfillment' }; state.fulfillments.push(row); return row; } },
  entitlementGrant: { create: async ({ data }) => { if (failGrant) throw new Error('GRANT_FAILED'); state.grants.push(data); return data; } },
  auditLog: { create: async ({ data }) => { state.audits.push(data); return data; } },
  $transaction: async (work) => { const before = structuredClone(state); try { return await work(db); } catch (e) { state = before; throw e; } },
};
globalThis.prisma = db;
const { checkoutFreeCoupon } = await import('../src/lib/fulfillment.ts');
const params = { userId: 'buyer', productId: 'product', couponIssueId: 'issue' };
let checks = 8;
async function check(name, work) { reset(); failGrant = false; await work(); checks++; console.log(`PASS ${name}`); }
await check('full discount uses sale price, consumes coupon and grants course without a Payment', async () => {
  assert.deepEqual(await checkoutFreeCoupon(params), { orderId: 'order' });
  assert.equal(state.orders[0].checkout, 'FREE'); assert.equal(state.orders[0].status, 'PAID');
  assert.equal(state.orders[0].subtotal, 200); assert.equal(state.orders[0].discount, 200); assert.equal(state.orders[0].total, 0);
  assert.equal(state.issue.status, 'USED'); assert.equal(state.enrollments.length, 1); assert.equal(state.grants.length, 1);
  assert.equal(state.enrollments[0].courseId, 'course'); assert.equal(state.audits.length, 2);
  assert.deepEqual(await checkoutFreeCoupon(params), { orderId: 'order' });
  assert.equal(state.orders.length, 1); assert.equal(state.grants.length, 1);
});
await check('another member cannot redeem this issue', async () => {
  await assert.rejects(checkoutFreeCoupon({ ...params, userId: 'other' }), { code: 'COUPON_UNAVAILABLE' });
  assert.equal(state.orders.length, 0);
});
await check('wrong product coupon is rejected', async () => {
  state.issue.coupon.products = [{ productId: 'other' }];
  await assert.rejects(checkoutFreeCoupon(params), { code: 'COUPON_PRODUCT_MISMATCH' });
});
await check('expired and not-yet-valid issues are rejected', async () => {
  state.issue.expiresAt = new Date(0);
  await assert.rejects(checkoutFreeCoupon(params), { code: 'COUPON_EXPIRED' });
  reset({ validStartsAt: new Date('2098-01-01') });
  await assert.rejects(checkoutFreeCoupon(params), { code: 'COUPON_EXPIRED' });
});
await check('minimum amount snapshot is respected', async () => {
  state.issue.minOrderAmount = 201;
  await assert.rejects(checkoutFreeCoupon(params), { code: 'COUPON_MIN_AMOUNT' });
});
await check('partial-discount coupon cannot create a free order', async () => {
  state.issue.discountPercent = 50;
  await assert.rejects(checkoutFreeCoupon(params), { code: 'AMOUNT_MISMATCH' });
  assert.equal(state.issue.status, 'ISSUED'); assert.equal(state.orders.length, 0);
});
await check('grant failure propagates out of transaction, restoring coupon and order', async () => {
  failGrant = true;
  await assert.rejects(checkoutFreeCoupon(params), /GRANT_FAILED/);
  assert.equal(state.issue.status, 'ISSUED'); assert.equal(state.orders.length, 0);
  assert.equal(state.enrollments.length, 0); assert.equal(state.fulfillments.length, 0);
});
await check('already-used issue cannot be spent again for a new order', async () => {
  state.issue.status = 'USED';
  await assert.rejects(checkoutFreeCoupon(params), { code: 'COUPON_UNAVAILABLE' });
});
await check('bundle grants course plus coaching entitlement and sessions', async () => {
  const original = structuredClone(product);
  try {
    product.kind = 'BUNDLE';
    product.items.push({ id: 'coaching-item', kind: 'COACHING_ACCESS', courseId: null, coachingOfferingId: 'offering',
      accessDuration: 'LIFETIME', accessDays: null, course: null, coachingOffering: { id: 'offering', title: 'Coaching' } });
    await checkoutFreeCoupon(params);
    assert.equal(state.enrollments.length, 1); assert.equal(state.coaching.length, 1);
    assert.equal(state.grants.length, 2); assert.deepEqual(state.sessions.map(s => s.sessionNo), [1, 2]);
    assert.equal(state.coaching[0].enrollmentId, 'enrollment');
  } finally { Object.assign(product, original); }
});
console.log(`${checks} checks passed (DB double; no external payment calls).`);
