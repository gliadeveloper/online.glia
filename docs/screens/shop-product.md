# /shop/[slug] — 상품 상세

> **상태:** implemented  
> **마지막 갱신:** 2026-07-30

---

## 0. 한 줄 요약

상품 정보를 확인하고, 보유 상태에 맞는 CTA로 구매·연장·복구를 진행한다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/shop/[slug]` |
| **Tab/Stack** | Stack |
| **Chrome** | Mobile ← + 제목 / Desktop unified header |
| **진입** | `/shop`, 홈 featured, Learning 만료 CTA |
| **정책 SSOT** | [lms-access-implementation.md](../lms-access-implementation.md) §6 |

---

## 2. 사용자 목표

- 무엇을 사는지( VOD / 코칭 / 번들 ) 이해
- 구매 시 적용될 권한 preview 확인
- 적절한 CTA로 checkout

---

## 3. 화면 구조

### Block: 상품 정보

| | |
|-|-|
| **역할** | catalog 설명 |
| **노출** | always |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 제목 | Product.title | ✅ |
| 2 | 설명 | description | ✅ |
| 3 | kind badge | COURSE / COACHING / BUNDLE | ✅ |
| 4 | 가격 | listPrice, salePrice | ✅ |

---

### Block: 구매 preview

| | |
|-|-|
| **역할** | checkout 전 적용 결과 안내 |
| **노출** | always |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | preview lines | `PurchasePreviewLine[]` | ✅ |

---

### Block: CTA

| | |
|-|-|
| **역할** | Shop state별 primary action |
| **노출** | always (label 변경) |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | primary button | `ProductShopState` | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| CTA (purchase 등) | checkout | `/api/checkout` |
| owned | 내학습 | `/learning/[slug]` |

---

## 4. 상태 매트릭스

### 4.1 접근 · 로그인

| 조건 | UI | 이동 |
|------|-----|------|
| 비로그인 | 상품 보기 OK; CTA → login | `/login?next=…` |
| 로그인 | 전체 | — |

### 4.2 ProductShopState

| 조건 | UI | CTA | 이동 |
|------|-----|-----|------|
| `purchase` | 구매하기 | checkout | API |
| `owned` | 수강 중 | `/learning/…` | |
| `extend` | N일 연장 | checkout | API |
| `restore` | 평생 복구 | checkout | API |
| `upgrade` | 평생 업그레이드 | checkout | API |
| `partial` | 코칭 추가 | checkout | API |
| 전 item skip | 409 ALREADY_OWNED | owned UI | — |

---

## 5. 연결 & 플로우

| 트리거 | 대상 |
|--------|------|
| checkout 성공 | `/orders/[id]`, `/learning?purchased=1` |

**관련 플로우:** [purchase-to-learning.md](./flows/purchase-to-learning.md)

---

## 6. Empty / Error / Edge

| 케이스 | UI | CTA |
|--------|-----|-----|
| slug 없음 | 404 | — |
| ALREADY_OWNED | 메시지 | 내학습 |

---

## 7. 구현 & 추적

| | |
|-|-|
| **Page** | `src/app/(app)/(stack)/shop/[slug]/page.tsx` |
| **Components** | `product-detail-panel`, `purchase-preview-panel` |
| **Lib** | `src/lib/shop-purchase-state.ts` |
| **API** | `/api/checkout`, `/api/products/[slug]` |

---

## 8. 미결 & v2

| 항목 | 메모 |
|------|------|
| 쿠폰 | v2 |
| 연장 전용 SKU 가격 | v2 |
