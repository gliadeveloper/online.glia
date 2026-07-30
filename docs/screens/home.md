# / — 홈

> **상태:** implemented  
> **마지막 갱신:** 2026-07-30  
> **IA 상세:** [flows/home-ia.md](./flows/home-ia.md)

---

## 0. 한 줄 요약

앱 진입점 — 오늘의 체크인 CTA와 **개인화 피드**(수강·코칭·Shop)로 다음 행동으로 보낸다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/` |
| **Tab/Stack** | Tab (Primary destination) |
| **Chrome (Mobile)** | **Home Brand Hero** — L0 `on-hero` + hero copy/CTA, feed는 `--radius-hero-bottom` 아래 |
| **Chrome (Desktop)** | Unified header (L0 + L1 inline) + contained hero band + feed |
| **진입** | 앱 실행, 로고, 하단 탭 「홈」, Stack `backTo` 기본 `/` |
| **정책 SSOT** | [navigation-chrome-policy.md](../navigation-chrome-policy.md) § Home Brand Hero · L0/L1 |
| **IA SSOT** | [flows/home-ia.md](./flows/home-ia.md) |

---

## 2. 사용자 목표

| # | 목표 | 성공 신호 |
|---|------|-----------|
| 1 | **오늘 기록** — 데일리 체크인 시작 또는 완료 확인 | Hero CTA 탭 → daily form/report |
| 2 | **이어 학습** — 수강 중 코스로 복귀 | 코스 row → `/learning/[slug]` |
| 3 | **코칭 확인** — 회차·답변 대기 파악 | 세션 row → `/coaching/sessions/[id]` |
| 4 | **탐색·구매** — Shop 상품 발견 | 상품 row → `/shop/[slug]` |
| 5 | **계정·커뮤니티** (보조) | L0 utility → `/mypage` · `/community` |

**비로그인:** 1번은 로그인 유도, 4번(Shop) 중심. 2·3번 피드 섹션 숨김.

---

## 3. 화면 구조

> **정보 계층:** L0 Global → Hero (Primary CTA) → Feed panels (Secondary) → Feed rows (Tertiary).  
> 상세 트리·우선순위·Mermaid는 [home-ia.md](./flows/home-ia.md).

### Block: L0 Global (Mobile on-hero only)

| | |
|-|-|
| **역할** | 앱 식별 + 보조 진입 (홈 전용 integrated chrome) |
| **노출** | Mobile `/` only — `MobileGlobalHeader variant="on-hero"` |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 워드마크 「온라인 학습」 | Link → `/` | ✅ |
| 2 | 커뮤니티 아이콘 | Link → `/community` (aria: 커뮤니티 검색) | ✅ |
| 3 | 프로필/로그인 | 로그인 → `/mypage`, 비로그인 → `/login` | ✅ |

**Desktop:** L0는 unified header (`BrandMark` + `HeaderAuthAction`). Hero utility 아이콘 없음.

---

### Block: Hero — 인사 · 오늘 · 체크인 CTA

| | |
|-|-|
| **역할** | **Primary CTA** — 오늘 데일리 체크인 (앱의 daily habit anchor) |
| **노출** | always — Mobile `HomeBrandHero` / Desktop `HomeHeroDesktop` |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 인사 | 로그인: `안녕하세요, {name}님` / 비로그인: `안녕하세요` | ✅ |
| 2 | 프롬프트 | 로그인: 「오늘 하루는 어떠셨나요?」 / 비로그인: 로그인 유도 copy | ✅ |
| 3 | 오늘 날짜 | `Intl` ko-KR, 요일 포함. 로그인 시 daily form `timezone` | ✅ |
| 4 | CTA (capsule) | copy·href는 [상태 매트릭스](#4-상태-매트릭스) | ✅ |
| 5 | CTA 완료 스타일 | `home-hero__cta--completed` when submitted | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| CTA (비로그인) | 로그인 | `/login?next=%2Fcheckin` |
| CTA (미제출) | 데일리 폼 | `/checkin/daily/{dateKey}` |
| CTA (제출 완료) | 데일리 리포트 | `/checkin/daily/{dateKey}/report` |
| CTA (로그인·daily 없음) | 체크인 허브 | `/checkin` |

주간 체크인은 Hero에서 직접 노출하지 않음 → `/checkin?tab=weekly` discover ([chrome policy](../navigation-chrome-policy.md)).

---

### Block: Feed — 수강중 강좌

| | |
|-|-|
| **역할** | ACTIVE enrollment shortcut — **개인화 1순위** |
| **노출** | 로그인 + ACTIVE ≥ 1 (0건이면 **섹션 전체 omit**) |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 패널 제목 | 「수강중 강좌」 | ✅ |
| 2 | 더보기 | → `/learning` (내학습 Tab) | ✅ |
| 3 | Row (max **3**) | ACTIVE only, `progressPercent`, completed/total lessons | ✅ |
| 4 | 썸네일 | `course.thumbnailUrl` or placeholder | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| Row | 코스 상세 | `/learning/[slug]` |
| 더보기 | 내학습 Tab | `/learning` |

---

### Block: Feed — 코칭 세션

| | |
|-|-|
| **역할** | 최근 회차·상태·답변 대기 shortcut |
| **노출** | 로그인 + 세션 ≥ 1 (0건 omit) |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 패널 제목 | 「코칭 세션」 | ✅ |
| 2 | 더보기 | → `/coaching` | ✅ |
| 3 | Row (max **5**) | sessionNo, coach, status label, pending Q&A count | ✅ |
| 4 | PUBLISHED row | → session detail | ✅ |
| 5 | 비PUBLISHED row | → coaching list | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| Row (published) | 회차 상세 | `/coaching/sessions/[id]` |
| Row (draft 등) | 코칭 목록 | `/coaching` |
| 더보기 | 코칭 허브 | `/coaching` |

---

### Block: Feed — 추천 상품

| | |
|-|-|
| **역할** | Catalog discovery — 로그인 여부 무관 **항상 마지막 패널** |
| **노출** | active products ≥ 1 (0건 omit) |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 패널 제목 | 「추천 상품」 | ✅ |
| 2 | 더보기 | → `/shop` | ✅ |
| 3 | Row (max **3**) | kind label, price or 「수강 중」 if owned | ✅ |
| 4 | owned 표시 | `shop-purchase-state` | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| Row | 상품 상세 | `/shop/[slug]` |
| 더보기 | Shop 목록 | `/shop` |

---

### Feed 패널 공통 (`HomeFeedPanel`)

- 세로 스택, 패널 간 일정 gap
- 각 패널: header (title + more link) + list of `HomeFeedRow`
- Mobile: hero bottom radius 아래 `--color-surface` feed surface

---

## 4. 상태 매트릭스

### Hero CTA

| 조건 | CTA 라벨 | CTA href |
|------|----------|----------|
| 비로그인 | 로그인하고 기록하기 | `/login?next=%2Fcheckin` |
| 로그인 · daily form 없음 | 지금 기분 기록하기 | `/checkin` |
| 로그인 · 미제출 | 지금 기분 기록하기 | `/checkin/daily/{dateKey}` |
| 로그인 · 제출 완료 | 오늘 리포트 보기 | `/checkin/daily/{dateKey}/report` |

### Feed 가시성

| 조건 | 수강중 | 코칭 | 추천 상품 |
|------|--------|------|-----------|
| 비로그인 | — | — | ✅ (있으면) |
| 로그인 · 각 0건 | omit | omit | ✅ |
| 로그인 · 데이터 있음 | ✅ (≤3) | ✅ (≤5) | ✅ (≤3) |

### Chrome

| viewport | L0 | L1 | Hero | Feed |
|----------|----|----|------|------|
| Mobile | on-hero (홈 only) | bottom tab | full-bleed gradient | below radius |
| Desktop | unified header | inline nav | contained band | max-width column |

---

## 5. 연결 & 플로우

### Outbound (홈 →)

| 출처 | 대상 | 용도 |
|------|------|------|
| Hero CTA | `/checkin/daily/*`, `/checkin/daily/*/report`, `/login`, `/checkin` | daily habit |
| L0 utility | `/community`, `/mypage`, `/login` | 보조 탐색 |
| Feed · 수강 | `/learning/[slug]`, `/learning` | 학습 복귀 |
| Feed · 코칭 | `/coaching/sessions/[id]`, `/coaching` | 코칭 |
| Feed · Shop | `/shop/[slug]`, `/shop` | commerce |
| L1 Tab | `/community`, `/learning` | Primary nav (chrome policy) |

### Inbound (→ 홈)

| 출처 | 비고 |
|------|------|
| 앱 cold start | default landing |
| 하단 탭 「홈」 | Tab reset |
| Stack `backTo` default | `/` |
| 로고 / 워드마크 | `/` |

### 관련 플로우

| 문서 | 관계 |
|------|------|
| [flows/home-ia.md](./flows/home-ia.md) | **홈 IA SSOT** — 계층·우선순위·다이어그램 |
| [flows/purchase-to-learning.md](./flows/purchase-to-learning.md) | Shop feed → 구매 → `/learning` |
| [checkin-hub.md](./checkin-hub.md) | Hero CTA ↔ daily/weekly 허브 |

---

## 6. Empty / Error

| 상황 | UI | 비고 |
|------|-----|------|
| Feed 전체 0 panel | Hero만 표시 | 비로그인+상품 없음, 또는 로그인+수강·코칭·상품 모두 0 |
| 수강/코칭 0 · Shop만 | Shop 패널만 | 의도된 omit (empty state 카드 없음) |
| daily form 미구성 | CTA → `/checkin` | fallback |
| 세션 fetch 실패 | _(미구현)_ | v2: 섹션 error boundary |

---

## 7. 구현 & 추적

| | |
|-|-|
| **Page** | `src/app/(app)/(tabs)/page.tsx` |
| **Hero** | `src/components/home/home-hero.tsx` |
| **Feed panels** | `home-feed-panel.tsx`, `enrolled-courses-feed-section.tsx`, `coaching-sessions-feed-section.tsx`, `featured-products-section.tsx` |
| **Chrome** | `mobile-global-header.tsx` (on-hero), `unified-header.tsx`, `primary-nav-bottom.tsx` |
| **Data** | `getCurrentUser`, `getCheckInOverview`, `getUserEnrollments`, `getUserCoachingSessionsForHomeFeed`, `getActiveProducts`, `getCatalogProductShopStates` |

---

## 8. 미결 & v2

| # | 항목 | 메모 |
|---|------|------|
| 1 | Feed 섹션 순서 고정 | 수강 → 코칭 → Shop. 라이브·커뮤니티 digest 미포함 |
| 2 | 「추천」 알고리즘 | v1 = active products 상위 N — curated/개인화 TBD |
| 3 | Hero 주간 CTA | v1 없음 — checkin hub에서 only |
| 4 | 비로그인 Hero | CTA는 login 유도; 체크인 copy는 노출 |
| 5 | Feed empty 카드 | v1 omit; 「수강 시작하기」 placeholder v2 검토 |
| 6 | L0 커뮤니티 아이콘 | href `/community` — 검색 전용 UI는 v2 |
| 7 | Live upcoming | 홈 digest 슬롯 v2 ([home-ia](./flows/home-ia.md) § Reserved) |
