// Run from a normal terminal: npm run test:free-coupon:db
// Creates a private temporary PostgreSQL cluster; never reads application env files.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.ts';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = fs.mkdtempSync(path.join(fs.realpathSync('/tmp'), 'coupon-db-'));
const data = path.join(root, 'data');
const port = 55439; // Unix socket only; each run uses a unique socket directory.
const binary = name => process.env.COUPON_TEST_PG_BIN ? path.join(process.env.COUPON_TEST_PG_BIN, name) : name;
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
let started = false;
let db;
let pool;
let passed = 0;
try {
  run(binary('initdb'), ['-D', data, '--no-locale', '--encoding=UTF8', '--auth=trust']);
  run(binary('pg_ctl'), ['-D', data, '-l', path.join(root, 'postgres.log'), '-o', `-h '' -k ${root} -p ${port} -c unix_socket_permissions=0700`, 'start', '-w', '-t', '15']);
  started = true;
  const url = `postgresql://${encodeURIComponent(os.userInfo().username)}@localhost:${port}/postgres?host=${encodeURIComponent(root)}`;
  const config = path.join(root, 'test.config.ts');
  fs.writeFileSync(config, `import { defineConfig } from ${JSON.stringify(path.join(repo, 'node_modules/prisma/config.js'))};\nexport default defineConfig(${JSON.stringify({ schema: path.join(repo, 'prisma/schema.prisma'), migrations: { path: path.join(repo, 'prisma/migrations') }, datasource: { url } })});\n`);
  run(process.execPath, [path.join(repo, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy', '--config', config]);
  console.log('PASS all migrations applied to isolated PostgreSQL');
  pool = new Pool({ host: root, port, database: 'postgres', user: os.userInfo().username, max: 5 });
  db = new PrismaClient({ adapter: new PrismaPg(pool) });
  // Install the explicit test client before loading the real application modules.
  globalThis.prisma = db;
  process.env.DATABASE_URL = url;
  const { checkoutFreeCoupon } = await import('../src/lib/fulfillment.ts');
  const coach = await db.user.create({ data: { email: 'coach@test.invalid', role: 'COACH' } });
  let seq = 0;
  async function fixture(overrides = {}) {
    seq++;
    const buyer = await db.user.create({ data: { email: `buyer${seq}@test.invalid` } });
    const course = await db.course.create({ data: { title: 'Coupon test', instructorId: coach.id, status: 'PUBLISHED' } });
    const offering = await db.coachingOffering.create({ data: { title: 'Coaching', slug: `test-${seq}`, coachId: coach.id, totalSessions: 2, validDays: 30 } });
    const product = await db.product.create({ data: { title: 'Bundle', kind: 'BUNDLE', listPrice: 1000, salePrice: 200,
      items: { create: [{ kind: 'COURSE_ACCESS', courseId: course.id }, { kind: 'COACHING_ACCESS', coachingOfferingId: offering.id }] } } });
    const coupon = await db.shopCoupon.create({ data: { name: 'Free', discountType: 'PERCENT', discountPercent: 100, minOrderAmount: 200,
      issueStartsAt: new Date(0), issueEndsAt: new Date('2099-01-01'), validityKind: 'DAYS_FROM_ISSUE', validDays: 30,
      products: { create: { productId: product.id } } } });
    const issue = await db.shopCouponIssue.create({ data: { couponId: coupon.id, userId: buyer.id, discountType: 'PERCENT', discountPercent: 100,
      minOrderAmount: 200, validStartsAt: new Date(0), expiresAt: new Date('2099-01-01'), ...overrides } });
    return { userId: buyer.id, productId: product.id, couponIssueId: issue.id };
  }
  async function check(name, work) { await work(); passed++; console.log(`PASS ${name}`); }
  await check('full-discount order grants course, coaching and sessions without payment', async () => {
    const p = await fixture();
    const result = await checkoutFreeCoupon(p);
    const order = await db.order.findUniqueOrThrow({ where: { id: result.orderId }, include: { payments: true, fulfillments: true } });
    assert.equal(order.checkout, 'FREE'); assert.equal(order.status, 'PAID'); assert.equal(order.subtotal, 200);
    assert.equal(order.discount, 200); assert.equal(order.total, 0); assert.equal(order.payments.length, 0); assert.equal(order.fulfillments.length, 1);
    assert.equal((await db.shopCouponIssue.findUniqueOrThrow({ where: { id: p.couponIssueId } })).status, 'USED');
    assert.equal(await db.enrollment.count({ where: { userId: p.userId } }), 1);
    assert.equal(await db.coachingEntitlement.count({ where: { userId: p.userId } }), 1);
    assert.equal(await db.coachingSession.count({ where: { userId: p.userId } }), 2);
    assert.deepEqual(await checkoutFreeCoupon(p), result);
    assert.equal(await db.order.count({ where: { userId: p.userId } }), 1);
  });
  await check('simultaneous submissions cannot duplicate order or grants', async () => {
    const p = await fixture();
    const results = await Promise.allSettled([checkoutFreeCoupon(p), checkoutFreeCoupon(p)]);
    assert(results.some(r => r.status === 'fulfilled'));
    assert.equal(await db.order.count({ where: { userId: p.userId } }), 1);
    assert.equal(await db.enrollment.count({ where: { userId: p.userId } }), 1);
    assert.equal(await db.coachingEntitlement.count({ where: { userId: p.userId } }), 1);
  });
  await check('DB grant failure rolls back coupon, order and access together', async () => {
    const p = await fixture();
    await pool.query(`CREATE FUNCTION test_fail_grant() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'TEST_GRANT_FAILURE'; END $$;
      CREATE TRIGGER test_fail_grant BEFORE INSERT ON entitlement_grants FOR EACH ROW EXECUTE FUNCTION test_fail_grant();`);
    try { await assert.rejects(checkoutFreeCoupon(p)); }
    finally { await pool.query('DROP TRIGGER test_fail_grant ON entitlement_grants; DROP FUNCTION test_fail_grant();'); }
    assert.equal((await db.shopCouponIssue.findUniqueOrThrow({ where: { id: p.couponIssueId } })).status, 'ISSUED');
    assert.equal(await db.order.count({ where: { userId: p.userId } }), 0);
    assert.equal(await db.enrollment.count({ where: { userId: p.userId } }), 0);
    assert.equal(await db.coachingEntitlement.count({ where: { userId: p.userId } }), 0);
  });
  await check('coupon ownership and product scope are enforced', async () => {
    const p = await fixture(); const other = await fixture();
    await assert.rejects(checkoutFreeCoupon({ ...p, userId: other.userId }), { code: 'COUPON_UNAVAILABLE' });
    await assert.rejects(checkoutFreeCoupon({ ...p, productId: other.productId }), { code: 'COUPON_PRODUCT_MISMATCH' });
  });
  await check('expiry, minimum amount and positive totals are rejected', async () => {
    await assert.rejects(checkoutFreeCoupon(await fixture({ expiresAt: new Date(0) })), { code: 'COUPON_EXPIRED' });
    await assert.rejects(checkoutFreeCoupon(await fixture({ minOrderAmount: 201 })), { code: 'COUPON_MIN_AMOUNT' });
    const p = await fixture({ discountPercent: 50 });
    await assert.rejects(checkoutFreeCoupon(p), { code: 'AMOUNT_MISMATCH' });
    assert.equal((await db.shopCouponIssue.findUniqueOrThrow({ where: { id: p.couponIssueId } })).status, 'ISSUED');
  });
  console.log(`SUCCESS: ${passed} PostgreSQL integration checks passed.`);
} catch (error) {
  console.error('FAIL:', error.stderr?.toString() || error.stack || error.message);
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
  await pool?.end();
  if (started) {
    try { run(binary('pg_ctl'), ['-D', data, 'stop', '-m', 'immediate', '-w']); started = false; }
    catch (error) { console.error('Temporary PostgreSQL could not be stopped:', error.message); process.exitCode = 1; }
  }
  if (!started) fs.rmSync(root, { recursive: true, force: true });
  else console.error(`Temporary cluster retained at ${root}`);
}
