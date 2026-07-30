# LMS 수강 권한 · Shop 정책 (구현 완료 범위)

> **문서 목적:** 2026-07 기준, 수강 기간(Access) · Shop CTA · Fulfillment 정책 중 **결정·적용된 사항**을 한곳에 정리한다.  
> **관련 문서:** [lms-access-entitlements.md](./lms-access-entitlements.md) (DB/도메인 설계 원본)  
> **범위 밖:** 케이스별 할인 SKU, 쿠폰, Admin ProductItem UI, 차액 결제

---

## 1. 이번에 완료한 범위

| 영역 | 상태 |
|------|------|
| DB 스키마 (`AccessDurationKind`, `Enrollment` 기간 필드, `EXPIRED`) | ✅ |
| 마이그레이션 + 기존 데이터 LIFETIME 백필 | ✅ |
| 접근 판단 (`canAccessEnrollment`, lazy expiry materialize) | ✅ |
| `COMPLETED` 수료 후 복습 허용 | ✅ |
| Fulfillment merge (연장·복구·업그레이드, 진도 보존) | ✅ |
| Checkout 가드 (`ALREADY_OWNED` 409) | ✅ |
| Shop UI 상태 (`extend` / `restore` / `upgrade` / `partial` / `owned` / `purchase`) | ✅ |
| 내 학습 / 만료 안내 / 레슨 게이트 | ✅ |
| QA 시드 페르소나 | ✅ |
| 케이스별 할인·쿠폰·연장 전용 SKU | ❌ 미구현 |

---

## 2. 핵심 설계 원칙 (결정)

1. **Access ≠ Progress**  
   - `COMPLETED` = 커리큘럼 100% (수료). 기간 내면 **복습 가능**.  
   - `EXPIRED` = `validUntil` 경과. **접근 불가**.

2. **Catalog → Instance → Grant** (코칭과 동형)  
   - Catalog: `ProductItem.accessDuration` + `accessDays`  
   - Instance: `Enrollment.validFrom` / `validUntil` + 스냅샷  
   - Grant: `EntitlementGrant` → `enrollmentId`

3. **1 User × 1 Course = 1 Enrollment**  
   - 재구매·연장·업그레이드는 **기존 row 갱신**.  
   - `progressPercent`, `LessonProgress`, `completedAt` **절대 초기화하지 않음**.

4. **Shop CTA는 Enrollment 기준**  
   - “이 상품을 예전에 샀는지”가 아니라 **현재 유효한 접근 권한**으로 판단.  
   - 주문(Orders) = SKU별 영수증, 내 학습(Learning) = **코스당 카드 1개**.

5. **다운그레이드 금지**  
   - `LIFETIME` 보유 중 `FIXED_DAYS` SKU 구매 → 강의는 `skip`, 코칭만 `partial` 가능.  
   - Fulfillment merge에서도 LIFETIME → FIXED 전환 **하지 않음**.

---

## 3. Catalog 정책

### 3.1 `AccessDurationKind`

| 값 | `validUntil` | 의미 |
|----|--------------|------|
| `LIFETIME` | `null` | 평생 수강 |
| `FIXED_DAYS` | `now + accessDays` | N일 무제한 수강 (`accessDays` > 0 필수) |

### 3.2 정책 우선순위

1. `ProductItem` (COURSE_ACCESS)  
2. `Course.defaultAccessDuration` / `defaultAccessDays` (Admin 부여 등 fallback)  
3. COACHING_ACCESS는 VOD 기간 무관 → `CoachingOffering.validDays` 유지

### 3.3 데모 Seed 상품

| slug | kind | VOD 기간 | Shop 라우팅 |
|------|------|----------|-------------|
| `nextjs-vod-only` | COURSE_ONLY | FIXED_DAYS 90일 | 연장(extend) |
| `nextjs-vod-coaching-bundle` | BUNDLE | LIFETIME | 복구(restore) · 업그레이드 |
| `coaching-3sessions` | COACHING_ONLY | — | 코칭 단독 |

---

## 4. Enrollment / Status 정책

### 4.1 필드 의미

| 필드 | 설명 |
|------|------|
| `enrolledAt` | 최초 등록일 (변경 없음, 리포트용) |
| `validFrom` | **현재** 권한 구간 시작 (만료 후 재구매 시 `now`로 갱신) |
| `validUntil` | 권한 종료. `null` = 평생 |
| `accessDuration` / `accessDays` | 부여 시점 Catalog **스냅샷** |
| `expiredAt` | `EXPIRED` 전환 시각 |

### 4.2 Status ↔ 접근

| Status | 레sson 접근 | UI |
|--------|-------------|-----|
| `ACTIVE` | ✅ (기간 내) | 수강 중 |
| `COMPLETED` | ✅ (기간 내) | 수료 · D-N / 평생 |
| `EXPIRED` | ❌ | 만료 안내 + Shop 링크 |
| `DROPPED` / `SUSPENDED` | ❌ | 차단 |

### 4.3 만료 처리

- **Lazy materialize:** 레sson/Shop 진입 시 `validUntil < now` → DB `status = EXPIRED`, `expiredAt` 기록.  
- Learning gate: `ACTIVE`, `COMPLETED`, `EXPIRED` 조회 후 `canAccessEnrollment`로 최종 판단.

---

## 5. Fulfillment · Grant Action 정책

Checkout/Fulfillment 전 **`evaluateCourseGrantAction`** 으로 아이템별 action 결정:

| Action | 조건 | Fulfillment 동작 |
|--------|------|------------------|
| `grant` | Enrollment 없음 | 신규 create + 스냅샷 |
| `renew` | 만료 또는 `validUntil` 경과 | 기간 재부여 (진도 유지) |
| `upgrade` | 유효 + FIXED → LIFETIME SKU | `validUntil = null`, `accessDuration = LIFETIME` |
| `skip` | 동일·상위 권한 이미 보유 | Enrollment 변경 없음 |

### 5.1 FIXED_DAYS 연장(renew) 계산

```
base = max(validUntil, now)   // 아직 유효하면 남은 기간 위에 가산
validUntil = base + accessDays
```

- **만료 후 renew:** `validFrom = now`, `status` → `ACTIVE` (progress에 따라 `COMPLETED` 유지 가능).

### 5.2 LIFETIME renew (복구)

- 만료 상태에서 LIFETIME SKU 구매 → `validUntil = null`, `accessDuration = LIFETIME`.  
- UI에서는 **「연장」이 아니라 「평생 수강 복구」**.

### 5.3 코칭

- 동일 offering에 **유효한** `CoachingEntitlement` 있으면 `skip`.  
- 번들 재구매 시 VOD `skip` + 코칭 `grant` → **partial fulfillment**.

### 5.4 Checkout 가드

- 모든 course/coaching item이 `skip`이면 **`canCheckout: false`**, HTTP **409 `ALREADY_OWNED`**.  
- 메시지: *「이미 보유 중인 수강권과 동일하거나 더 유리한 권한을 가지고 있습니다.」*

---

## 6. Shop UX 정책

Shop 상태는 **`assessProductCheckout` → `deriveProductShopState`** 로 산출.

### 6.1 ProductShopState 종류

| kind | CTA (예) | 발생 조건 |
|------|----------|-----------|
| `purchase` | 구매하기 | 신규 또는 grantable item 존재 |
| `owned` | 수강 중 (내 학습으로) | 전 item skip, checkout 불가 |
| `extend` | N일 수강 연장 | course action = `renew`, SKU = FIXED_DAYS |
| `restore` | 평생 수강 복구 | course action = `renew`, SKU = LIFETIME |
| `upgrade` | 평생 수강 업그레이드 | course action = `upgrade` |
| `partial` | 코칭 추가 구매 | course skip + coaching grant |

### 6.2 「연장」vs「복구」 구분

| 사용자 상태 | VOD 90일 SKU | 번들/평생 SKU |
|-------------|--------------|---------------|
| FIXED 만료 | **extend** — N일 재시작 | **restore** — 평생 복구 |
| FIXED 수강 중 | owned (VOD) / **upgrade** (번들) | — |
| LIFETIME 보유 | owned | owned |

- **restore ≠ extend:** 만료 후 평생 SKU는 “기간 연장”이 아니라 **접근 등급 복구**.

### 6.3 구매 미리보기

상품 상세에 **`PurchasePreviewLine[]`** 로 「구매 시 적용」 preview 표시 (수강 종료일, 평생 전환, 코칭 제공 등).

### 6.4 만료 사용자 Shop 라우팅

| 함수 | 역할 |
|------|------|
| `findExtensionProductSlug` | `FIXED_DAYS` + `COURSE_ONLY` 우선 → extendHref |
| `findLifetimeRestoreProductSlug` | `LIFETIME` + `BUNDLE` 우선 → restoreHref |

Learning 만료 화면·내 학습 카드에 **두 링크** 노출 (restore가 extend와 다를 때).

### 6.5 가격 정책 (현재)

- 상품별 `listPrice` / `salePrice`만 적용.  
- **케이스별 할인·쿠폰·연장 전용 SKU 가격 분리는 미구현.**

향후 LMS 관행대로 진행 시:

- 의도별 **별도 product slug** + `salePrice` (연장권·업그레이드권)  
- 또는 **쿠폰** + `Order.discount`  
- 업그레이드 **차액 결제**는 3단계 옵션

---

## 7. Learning / My Learning 정책

| 화면 | 동작 |
|------|------|
| 코스 상세 / 레sson | `accessState === expired` → 404 대신 **만료 안내** + extend/restore 링크 |
| 내 학습 목록 | 코스당 **카드 1장** (동일 코스 VOD+번들 중복 없음) |
| 만료 카드 | 「90일 수강 연장」「평생 수강 복구」 |
| 수료(COMPLETED) | 기간 내면 **정상 재생** |
| 접근 요약 | `formatEnrollmentAccessSummary` — `D-N` / `평생 수강` / `수강 기간 만료` |

---

## 8. QA 시드 페르소나

비밀번호: **`demo-password`** · 반영: `npm run db:seed`

| 계정 | 상태 | QA 목적 |
|------|------|---------|
| `demo@localhost` | 번들 LIFETIME, COMPLETED, 코칭 | 평생·수료·번들 보유 |
| `customer@localhost` | 수강권·주문 없음 | 신규 구매 |
| `qa-vod-active@localhost` | VOD 90일, D-45, ACTIVE | 수강 중 / upgrade |
| `qa-expired@localhost` | EXPIRED (14일 전 만료) | extend / restore |
| `admin@localhost`, OAuth | 해당 코스 commerce reset | Admin 간섭 없음 |

---

## 9. 구현 파일 맵

| 역할 | 경로 |
|------|------|
| 접근·merge·grant action | `src/lib/enrollment-access.ts` |
| Shop assessment·UI state | `src/lib/shop-purchase-state.ts` |
| Checkout·fulfillment | `src/lib/fulfillment.ts` |
| Learning gate | `src/lib/learning.ts`, `src/lib/learning-course-detail.ts` |
| 내 학습 enrollments | `src/lib/learning-enrollments.ts` |
| Shop UI | `src/components/shop/product-*`, `purchase-preview-panel.tsx` |
| 만료 UI | `src/components/learning/enrollment-expired-notice.tsx` |
| 스키마 | `prisma/schema.prisma` |
| 마이그레이션 | `prisma/migrations/20260727160000_add_course_access_period/` |
| Seed | `prisma/seed.ts` → `seedAccessQaPersonas` |

---

## 10. 의도적으로 보류한 항목

| 항목 | 방향 (합의만, 미구현) |
|------|----------------------|
| 연장/복구/업그레이드 **별도 SKU·할인가** | 의도별 product slug + `salePrice` |
| 쿠폰 / win-back 캠페인 | `Order.discount` + Coupon 모델 |
| 업그레이드 **차액 결제** | 과거 OrderLine 기준 proration |
| Admin ProductItem 기간 편집 UI | `accessDuration`, `accessDays` |
| `EnrollmentAccessEvent` (연장 이력) | 2차 |
| Drip / 일시정지 | 2차 |
| LIFETIME → FIXED (다운그레이드) | v1 **미지원** |

---

## 11. 의사결정 요약

```
[Catalog]  SKU마다 accessDuration/accessDays 정의
     ↓
[Purchase] Checkout assess → item별 grant|renew|upgrade|skip
     ↓
[Instance] 1 Enrollment merge, 진도 유지, 다운그레이드 금지
     ↓
[Access]   ACTIVE/COMPLETED + validUntil → OK / EXPIRED → Shop
     ↓
[Shop UI]  extend(90일) | restore(평생) | upgrade | partial | owned
```
