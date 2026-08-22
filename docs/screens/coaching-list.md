# /coaching — 코칭 상품 목록

> **상태:** implemented  
> **비주얼:** GLIA Design System (`--glia-*` tokens · Pretendard · Discovery 카드)  
> **마지막 갱신:** 2026-08-22

---

## 0. 한 줄 요약

보유 중인 **코칭 상품(entitlement)** 목록을 보고, 상품별 회차 페이지로 들어간다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/coaching` |
| **Tab/Stack** | Tab |
| **Chrome** | Mobile separated header + bottom tab / Desktop unified header |
| **진입** | 하단 탭 「코칭」, 홈 피드 「더보기」 |
| **정책 SSOT** | [policies.md](../policies.md) |

> Shop catalog(`/shop`)와 구분 — 여기는 **이미 구매·등록된 코칭권**만.

---

## 2. 사용자 목표

- 보유 코칭 상품 확인
- 만료일·진행 회차 파악
- 상품 선택 → 회차 목록

---

## 3. 화면 구조

### Block: 코칭 상품 카드

| | |
|-|-|
| **역할** | entitlement 1건 요약 |
| **노출** | entitlement ≥ 1 |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 상품명 | `coachingOffering.title` | ✅ |
| 2 | 강사 프로필 사진 | `coach.profile.avatarUrl` or initial | ✅ |
| 3 | 강사 닉네임 | `coach.name` | ✅ |
| 4 | 만료일 | `validUntil` | ✅ |
| 5 | 진행 회차 | `{completedSessions}/{totalSessions}회차` | ✅ |
| 6 | 상태 chip | ACTIVE 등 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 카드 | 회차 목록 | `/coaching/[entitlementId]` |

---

## 4. 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect login |
| entitlement 0 | Empty + Shop CTA |

---

## 5. 연결 & 플로우

| 액션 | 대상 |
|------|------|
| 상품 카드 | `/coaching/[entitlementId]` |
| Shop CTA | `/shop` |

---

## 6. Empty / Error

| 상황 | UI |
|------|-----|
| 코칭권 0건 | Empty + Shop |

---

## 7. 구현 & 추적

| | |
|-|-|
| **Page** | `src/app/(app)/(tabs)/coaching/page.tsx` |
| **Components** | `coaching-entitlement-card.tsx` |
| **Lib** | `coaching-customer.ts`, `coaching-display.ts` |
| **Design** | GLIA Recovery Wellness — scope root `.glia-coaching`, `src/components/coaching/coaching-glia.css`, 토큰 `src/app/design-tokens/glia.css` |

---

## 8. 미결 & v2

| # | 항목 |
|---|------|
| 1 | EXPIRED entitlement 접근 제한 정책 |

---

# /coaching/[entitlementId] — 회차 목록

> **상태:** implemented  
> **비주얼:** GLIA Design System (`--glia-*` tokens · Pretendard · Discovery 카드)

---

## 0. 한 줄 요약

선택한 코칭 상품의 **회차 목록**을 보고 세션 상세로 진입한다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/coaching/[entitlementId]` |
| **Tab/Stack** | Stack |
| **진입** | `/coaching` 상품 카드 |

---

## 3. 화면 구조

### Block: 상품 헤더

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | 상품명 | ✅ |
| 2 | 강사 프로필 + 닉네임 | ✅ |
| 3 | 만료일 · 진행 회차 | ✅ |

### Block: 회차 목록

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | N회차 · 제목 | ✅ |
| 2 | 공개 상태 / 일정 label | ✅ |
| 3 | Q&A 미답 badge | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| PUBLISHED 회차 | 세션 상세 | `/coaching/sessions/[id]` |
| EMPTY/DRAFT | 카드 비활성 | — |

---

## 7. 구현 & 추적

| | |
|-|-|
| **Page** | `src/app/(app)/(stack)/coaching/[entitlementId]/page.tsx` |
| **Components** | `coaching-session-card.tsx` |
| **Design** | GLIA Recovery Wellness — scope root `.glia-sessions` (Discovery), `src/components/coaching/coaching-stack-glia.css` |
| **Mode** | Discovery (카드) — 회차를 고르는 화면. 회차 상세(`/coaching/sessions/[id]`)는 Editorial |
