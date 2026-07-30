# 디자인 시스템 정책

온라인 학습 앱 `(app)` 영역에 적용하는 시각·상호작용 규칙.  
**KRDS v1.0**을 기준으로 하되, 브랜드 확정 전까지 **중립·기능 중심** 팔레트를 사용한다.  
내비게이션 chrome 규칙은 [navigation-chrome-policy.md](./navigation-chrome-policy.md)를 따른다.

> **시각 방향 (App Tone v1):** [visual-direction.md](./visual-direction.md) — neutral chrome + subtle motion.  
> 디자인 요청 시 **「App Tone v1」** 또는 **「design-system 따라」**만 언급하면 된다.

---

## 1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **의미 기반 색** | 장식용 브랜드 컬러 없음. primary blue = 행동·링크, emerald/amber/red/sky = 상태.feedback |
| **Border-first** | 깊이는 그림자보다 **1px border + surface 대비**로 표현. shadow는 `sm` 수준만 |
| **토큰 우선** | 하드코딩 hex 지양. CSS 변수(`--color-*`, `--radius-*`)로 통일 |
| **접근성 내장** | 포커스·대비·터치 타깃·스크린리더 라벨은 선택이 아닌 기본값 |
| **placeholder 브랜드** | 로고·슬로건은 자리만. 특정 상호·카피 미사용 |

### 1.1 App Tone v1 (Visual Direction)

**전체 요약:** [visual-direction.md](./visual-direction.md)

| 축 | 규칙 |
|----|------|
| **Neutral chrome** | 탭·헤더 **선택 상태** = `text-primary` / `text-secondary` + semibold + outline→filled icon. primary blue **금지** |
| **Action blue** | CTA·텍스트 링크·`:focus-visible`만 `--color-action-primary` |
| **Subtle motion** | `--motion-duration-*`, `--motion-ease-*` 토큰. tap scale·crossfade·settle |
| **참고 구현** | `PrimaryNavBottom`, `NavTabItem`, `nav-icons.tsx`, **`HomeBrandHero`** (홈 전용) |

### 1.2 Home Brand Hero (홈 `/` 예외)

Mobile Tab 홈만 **L0를 Hero surface에 integrated** (`on-hero` variant). Hero copy·CTA와 border 없이 한 canvas; feed·bottom tab은 App Tone v1 유지.

| 토큰 | 용도 |
|------|------|
| `--color-hero-from` / `--color-hero-to` | `teal-brand` → `surface` mix gradient |
| `--color-hero-text` / `--color-hero-text-muted` | `surface` · 76% mix |
| `--color-hero-cta` / `--color-hero-cta-text` | `surface` · `teal-700` |
| `--radius-hero-bottom` | Hero canvas 하단 → feed 전환 (nav-top × 2) |

**SSOT:** `src/app/design-tokens/home-colors.css` · brand `teal-brand` in `palette.css`

**구현:** [visual-direction.md § Home Brand Hero](./visual-direction.md#home-brand-hero-예외-패턴)

#### Home typography (mobile `/`)

| 슬롯 | Role | Weight | Tracking |
|------|------|--------|----------|
| L0 wordmark | `contextTitle` | semibold | `--typo-tracking-title` |
| Hero greeting | `display` | semibold | `--typo-tracking-display` |
| Hero prompt | `body` | regular | `--typo-tracking-body` |
| Hero date | `caption` | regular | `--typo-tracking-caption` |
| Hero CTA | `bodyCompact` | semibold | `--typo-tracking-body` |

여백: `--home-stack-*` 토큰 · [typography.md §3](./typography.md)

---

## 2. Design Tokens

**색상 팔레트 전체:** [colors.md](./colors.md) · **SSOT:** `src/app/design-tokens/palette.css`

### 2.1 색상 — Primitive palette

Grey · Blue · Red · Grey opacity · Orange · Yellow · Green · Teal · Purple — 각 50–900 단계.

| 계열 | CSS prefix | 예 |
|------|------------|-----|
| Grey | `--color-grey-{50…900}` | `--color-grey-900` |
| Blue | `--color-blue-{50…900}` | `--color-blue-500` |
| Red | `--color-red-{50…900}` | `--color-red-500` |
| Grey opacity | `--color-grey-opacity-{50…900}` | `rgb(… / alpha)` |
| Orange / Yellow / Green / Teal / Purple | `--color-{name}-{50…900}` | `--color-teal-500` |

**규칙:** 컴포넌트는 **시맨틱 토큰 우선**. primitive는 시맨틱에 없을 때만 직접 참조.

### 2.2 색상 — Semantic (Light)

`:root` 시맨틱 → primitive 매핑. 상세: [colors.md § Semantic mapping](./colors.md#semantic-mapping-light)

| 토큰 | Primitive | 용도 |
|------|-----------|------|
| `--color-text-primary` | `grey-900` | 본문·제목 |
| `--color-text-secondary` | `grey-700` | 보조 설명·메타 |
| `--color-text-disabled` | `grey-500` | placeholder·비활성 |
| `--color-action-primary` | `blue-500` | CTA·링크·포커스 |
| `--color-action-primary-hover` | `blue-600` | primary hover |
| `--color-border` | `grey-300` | 카드·입력·구분선 |
| `--color-border-subtle` | `grey-200` | chrome 구분선 |
| `--color-border-strong` | `grey-600` | hover border |
| `--color-surface` | `#ffffff` | 입력·버튼 배경 |
| `--color-surface-muted` | `grey-100` | 페이지 배경 |
| `--color-surface-elevated` | `#ffffff` | 카드·헤더 |
| `--color-focus-ring` | `blue-500` | `:focus-visible` |

### 2.3 색상 — Dark (`prefers-color-scheme: dark`)

시스템 다크 모드 연동. primary·surface·text가 light와 대칭 매핑된다.  
컴포넌트는 토큰만 참조하고, 개별 dark 클래스 남용을 피한다.

### 2.4 시맨틱 상태색 (palette 기반)

브랜드가 아닌 **피드백·상태** 전용. primitive 팔레트 사용.

| 상태 | Background | Text | Primitive |
|------|------------|------|-----------|
| **complete** | green-50 | green-800 | `--color-green-*` |
| **pending** | yellow-50 | yellow-900 | `--color-yellow-*` |
| **neutral** | surface-muted + border | — | grey |
| **info** | blue-50 | blue-900 | `--color-blue-*` |
| **error** | red-50 | red-800 | `--color-red-*` |
| **warning** | orange-50 | orange-900 | `--color-orange-*` |

상태는 **색상 + 아이콘/텍스트** 병행 (색각 접근성).

### 2.5 타이포그래피

**전체 규격:** [typography.md](./typography.md)

| 구분 | 규칙 |
|------|------|
| **토큰** | `typography1`–`typography7`, `subTypography1`–`subTypography13` — px 하드코딩 금지 |
| **기본 body** | `typography5` (17px @ 100%) — `body` 및 CSS 변수 기본값 |
| **컴포넌트** | `<Typography role="…">` 또는 `typo-*` / `typoRoleClass()` |
| **WebView** | iOS lookup table + Android formula; `TypographyScaleProvider`가 `:root` 변수 갱신 |
| **폰트** | `--font-sans` Geist Sans + system-ui · `--font-mono` Geist Mono |

#### `(app)` 시맨틱 Role (100% 기준)

| Role | Token | 용도 |
|------|-------|------|
| `pageTitle` | subTypography5 (24px) | Stack desktop h1 |
| `sectionTitle` | subTypography9 (18px) | 섹션·카드 h2 |
| `contextTitle` | subTypography10 (16px) | Mobile BackNav h1 |
| `body` | typography5 (17px) | 본문 |
| `bodySecondary` | subTypography11 (14px) | 보조·버튼·입력 |
| `caption` | subTypography12 (12px) | 배지·메타·nav label |

**규칙**

- 본문은 **typography5** 또는 **subTypography10** (16px+) — typography7 이하 본문 금지
- 페이지당 **h1 하나**. context bar 또는 `sr-only` h1
- `<html lang="ko">` 유지
- `(app)`에서 Tailwind `text-sm` / `text-lg` 등 font-size 유틸 **사용 금지**

### 2.6 간격·레이아웃

| 토큰/값 | 용도 |
|---------|------|
| `--header-height` | `3.5rem` (56px) — global/context header |
| `--nav-height-mobile` | `3.125rem` (50px) — bottom tab item min height |
| `--radius-nav-top` | `0.875rem` — bottom tab bar top corner radius |
| `--radius-hero-bottom` | `calc(var(--radius-nav-top) * 2)` — Home Brand Hero 하단 surface radius |
| `--radius-feed-panel` | `calc(var(--radius-nav-top) * 1.5)` — Home feed panel corner radius |
| `--nav-bar-shadow` | layered hairline + upward shadow on bottom tab bar |
| `--focus-offset` | `2px` — focus ring offset |
| `--radius-md` | `0.5rem` (8px) — 카드·버튼·입력·배지 |

**Radius scale (비율)** — 큰 surface일수록 한 단계 위 토큰 사용.

| 단계 | 토큰 | 비율 |
|------|------|------|
| Component | `--radius-md` | base |
| Chrome bar | `--radius-nav-top` | ×1.75 (`0.875rem`) |
| Feed panel | `--radius-feed-panel` | ×1.5 of nav-top |
| Page surface (hero) | `--radius-hero-bottom` | ×2 of nav-top |

하드코딩 rem/px 대신 위 토큰·`calc()`만 사용한다.
| `max-w-5xl` | 콘텐츠·헤더 최대 너비 (1024px container) |
| `px-4 py-6` | main 기본 padding |
| `gap-4` / `gap-6` | 카드 내부·섹션 간 |

### 2.7 Breakpoint

| 이름 | Tailwind | 정책 |
|------|----------|------|
| **Mobile** | `< lg` (< 1024px) | split/bottom tab, immersive stack |
| **Desktop** | `lg+` | unified header, inline primary nav |

Chrome 정책의 Mobile/Desktop 구분과 동일 breakpoint를 사용한다.

### 2.8 모션 (App Tone v1)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--motion-duration-fast` | `150ms` | tap scale |
| `--motion-duration-normal` | `220ms` | color·opacity crossfade |
| `--motion-duration-settle` | `360ms` | active icon settle |
| `--motion-ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | 일반 transition |
| `--motion-ease-spring` | `cubic-bezier(0.34, 1.35, 0.64, 1)` | tap·settle |

| 정책 | 설명 |
|------|------|
| `prefers-reduced-motion: reduce` | transition·animation 최소화 (전역) |
| 장식 bounce | chrome 외 UI에서 과한 bounce 금지. settle은 nav active 전환 한정 |

---

## 3. Surface & Elevation

| 레벨 | 스타일 | 사용 |
|------|--------|------|
| **Page** | `bg-surface-muted` | main 영역 바깥 배경 |
| **Panel** | `bg-surface-elevated` + `border` + `rounded-md` | 카드·폼 컨테이너 |
| **Chrome bar** | frosted `surface-elevated` + `border-subtle` + `nav-bar-shadow` | bottom tab 등 |
| **Header** | `surface-elevated/95` + `backdrop-blur-sm` + `border-b` (`border-subtle` 권장) | sticky chrome |
| **Shadow** | `shadow-sm`, hover `shadow-md` | entry card hover만. 기본 panel은 border 우선 |

---

## 4. 상호작용 (Interaction)

### 4.1 Focus

| 요소 | 규칙 |
|------|------|
| Shell·링크·버튼 | `.shell-focus-ring:focus-visible` — 3px solid focus-ring, offset 2px |
| Skip link | focus 시 좌상단 고정 노출, primary 배경 + 흰 텍스트 |

### 4.2 터치·클릭 타깃

- 인터랙티브 요소 **최소 44×44px** (`min-h-11`, bottom tab `min-h-12`)
- 카드형 링크: **블록 전체** 클릭 영역

### 4.3 Navigation 선택 상태

색상만으로 구분하지 않는다 (KRDS).

| 위치 | 시각 단서 | ARIA |
|------|-----------|------|
| Primary nav | **outline/filled icon** + **font-semibold** + text primary/secondary | `aria-current="page"` |
| Option button (폼) | fill/border 변화 + `aria-pressed` | — |
| 리스트 현재 항목 | `aria-current="page"` | — |

### 4.4 버튼 계층

| 계층 | 스타일 | 용도 |
|------|--------|------|
| **Primary** | `bg-action-primary` + white text | 저장·기록하기·주요 CTA |
| **Secondary** | border + surface-elevated | 취소·보조 |
| **Ghost/Link** | text-action-primary, transparent | 헤더 뒤로·텍스트 링크 |

Primary/Secondary는 **한 행에 나란히** 배치 시 동일 `min-h-11`, flex 1:1 (폼 footer).

---

## 5. 컴포넌트 패턴

코드명이 아닌 **UI 패턴** 기준 정리.

### 5.1 Chrome (Shell)

| 패턴 | 설명 |
|------|------|
| **BrandMark** | 36×36 placeholder + 슬로건 바(sm+) |
| **UnifiedHeader** | PC: BrandMark + inline nav + auth |
| **MobileGlobalHeader** | Mobile tab L0: `separated` (default) or `on-hero` (홈) |
| **PrimaryNavBottom** | Mobile tab: frosted edge-attached bar; outline↔filled icon crossfade |
| **HomeBrandHero** | Mobile `/`: hero canvas = L0 on-hero + copy/CTA + bottom radius; shell hides separated L0 |
| **HomeHeroDesktop** | Desktop `/`: contained hero band below unified header |
| **HomeFeedPanel** | 홈 feed: elevated panel + section header + list rows (`/` mobile feed stack) |
| **PrimaryNavInline** | Desktop: neutral active + outline/filled icon (App Tone v1) |
| **BackNav** | Mobile stack only: ← + centered title |
| **HeaderAuthAction** | 로그인 / 마이페이지 |

→ chrome 조합은 [navigation-chrome-policy.md §4](./navigation-chrome-policy.md) 참조.

### 5.2 Entry Card (진입 카드)

홈 등에서 **한 섹션으로 deeper route 진입**할 때.

| 속성 | 규칙 |
|------|------|
| 구조 | `<section>` + `<Link>` 블록 전체 |
| 제목 | h2 + `aria-labelledby` |
| 보조 | 날짜·한 줄 설명 (secondary text) |
| 상태 배지 | pill (rounded-full, ring-1, semantic color) |
| affordance | 우측 chevron — hover `surface-muted` (primary fill 지양, App Tone v1) |
| hidden text | `sr-only` 「~로 이동」 |

**예:** 홈 hero CTA → `/checkin/daily/{today}` · 허브 → `/checkin`

### 5.3 Home Feed Panel (홈 feed stack)

Hero 아래 **섹션형 list card** — dashboard feed 패턴 (수강중 강좌 · 추천 상품 등).

| 속성 | 규칙 |
|------|------|
| Panel | `surface-elevated` + `border-subtle` + `--radius-feed-panel`; padding `--home-stack-lg` |
| Header | `sectionTitle` + `더보기` (`bodySecondary` medium) · baseline align |
| Header tracking | title: `--typo-tracking-title` · more: `--typo-tracking-body` |
| Row gap (panel 내) | `--home-stack-md` |
| Stack gap (panel 간) | `--home-stack-xl` |
| Row title / subtitle | `bodyCompact` semibold + `caption` regular · gap `--home-stack-xs` |
| Row interaction | **Navigation row** — 행 전체 `<Link>` · 이동만 (§5.2 Entry Card와 동일 affordance) |
| Row hover / press | hover: `--color-home-row-hover` · active: `--color-home-row-active` (scale 없음) |
| Row trailing | chevron in muted circle · hover/focus 시 chevron bg/text transition |
| hidden text | `sr-only` 「{title} — 상세로 이동」 |

**구현:** `home-feed-panel.tsx` · `FeaturedProductsSection` · `EnrolledCoursesFeedSection`

### 5.4 Structured List (기록 목록)

| 속성 | 규칙 |
|------|------|
| 컨테이너 | border + divide-y + surface-elevated |
| 행 | `min-h-14` link row, hover muted bg |
| 좌 | primary label (날짜) |
| 우 | secondary hint (「기록 보기」) |

### 5.5 Form (체크인 등)

| 속성 | 규칙 |
|------|------|
| 질문 그룹 | `<fieldset>` + `<legend>` (필수 * + sr-only 「필수」) |
| 텍스트 입력 | border surface, focus ring, placeholder disabled color |
| 선택지 (텍스트) | stacked buttons, `aria-pressed` |
| 선택지 (emoji) | 56×56 tile, `aria-label` = option label |
| 오류 | `role="alert"`, red semantic panel |
| 성공 | `role="status"`, emerald semantic panel |
| footer | Secondary 취소 + Primary 제출 |

### 5.8 Check-in Hub (데일리 · 주간)

통합 허브 `/checkin` — cadence별 **Today-first** 패턴.

| 속성 | 데일리 | 주간 |
|------|--------|------|
| Primary card | 오늘 + status pill + CTA | 이번 주 + status pill + CTA |
| Strip | 최근 7일 (미래 없음) | 최근 8주 (미래 없음) |
| History | navigation row + chevron | navigation row + chevron |
| L3 cancel | `/checkin?tab=daily` | `/checkin?tab=weekly` |
| 미래 접근 | empty state → 오늘 CTA | empty state → 이번 주 CTA |
| period key | `YYYY-MM-DD` | 주 시작 일요일 `YYYY-MM-DD` |

**정책:** 과거·현재 period만 조회·수정. 미래 day/week는 UI 비노출 + API `FUTURE_PERIOD` 거부.

**구현:** `checkin/page.tsx` · `check-in-*` components · `lib/checkin-dates.ts` · `lib/checkin-hub.ts`

### 5.6 Status Pill (배지)

| 톤 | 의미 |
|----|------|
| complete | green (완료·결제됨·수강 중) |
| pending | amber (진행 중·미기록·대기) |
| neutral | muted + border |
| info | blue (부분 환불·안내성 상태) |

**SSOT:** `src/components/ui/status-pill.tsx` · `.status-pill` in `globals.css`  
`rounded-full`, semantic `--color-feedback-*` tokens, optional checkmark icon.

### 5.6.1 Shared App Tone primitives

| 클래스 | 용도 |
|--------|------|
| `.status-pill` | §5.6 상태 배지 |
| `.app-feedback` | info / success / error 인라인 배너 (`role="status"` / `role="alert"`) |
| `.app-btn--primary` / `--secondary` | 폼 footer CTA (§4.4) |

**토큰:** `--color-feedback-*`, `--color-row-*` (`globals.css` `:root`)

### 5.7 Page Header (본문)

Stack 페이지에서 context bar와 **중복 h1 방지**.

| viewport | h1 위치 |
|----------|---------|
| Mobile stack | BackNav title |
| Desktop stack | 본문 `text-2xl` 또는 section h2 (context bar 없음) |

보조 설명은 `text-sm text-secondary` 한 단락.

---

## 6. 아이콘

| 규칙 | 값 |
|------|-----|
| 스타일 | 1.75~2px stroke, outline SVG |
| 크기 | 24px (nav), 20px (chevron/back) |
| 장식 | `aria-hidden="true"` |
| 의미 전달 | 반드시 adjacent text 또는 `aria-label` |

Primary nav: Home / Community / Learning — outline (inactive) / filled (active) icon pair.

---

## 7. 접근성 체크리스트 (신규 UI)

- [ ] 페이지 h1 하나, heading level 순서 유지
- [ ] 인터랙티브 44px+, `:focus-visible` visible
- [ ] 선택·현재 상태: 색상 + 형태 + ARIA
- [ ] 폼: label/legend, 필수 표시, error alert
- [ ] skip link 대상 id 존재 (`#main-content`, `#primary-nav`, `#context-nav`)
- [ ] `prefers-reduced-motion` 깨지지 않음
- [ ] dark mode에서 토큰 대비 유지

---

## 8. 적용 범위

| 영역 | 상태 |
|------|------|
| `(app)` — 홈·커뮤니티·내학습·체크인·마이페이지 | ✅ 이 문서 적용 |
| `(customer)` — dashboard, lms, shop 등 | ❌ 레거시 (violet shell). 점진 이관 |
| `admin` | ❌ 별도 admin shell |
| `login` | ❌ 미적용 (추후 통합) |

신규 customer-facing UI는 `(app)` 패턴·토큰으로만 추가한다.

---

## 9. 금지·지양

| 항목 | 이유 |
|------|------|
| 브랜드 signature gradient hero | **홈 `/` Home Brand Hero**만 `--color-hero-*` 허용. 다른 Tab·Stack은 neutral |
| violet 등 legacy accent 신규 사용 | `(customer)`와 혼선 |
| 색상만으로 상태 구분 | KRDS·WCAG |
| shadow-lg 장식 카드 | border-first 원칙 |
| 14px 미만 본문 | typography7·subTypography12·13 본문 사용 금지 — [typography.md](./typography.md) |
| Chrome nav active에 primary blue | App Tone v1 — selection은 neutral |
| Tailwind `text-sm`/`text-lg` in `(app)` | typo 토큰 우회 — 스케일·WebView 동기화 깨짐 |

---

## 10. KRDS 매핑

| KRDS | 디자인 시스템 |
|------|---------------|
| 디자인 토큰 (색·형태) | §2 tokens, `--radius-md` |
| 헤더·탭바·메인 메뉴 | Shell patterns §5.1 |
| 버튼 | §4.4 계층 |
| 텍스트 입력·선택 | §5.4 Form |
| 구조화 목록 | §5.3 |
| 건너뛰기 링크 | globals skip-link |
| 배지 | §5.5 Status pill |
| 포커스·키보드 | §4.1, §7 |

---

## 11. 관련 문서

- [visual-direction.md](./visual-direction.md) — **App Tone v1** (한 페이지 요약·요청 문구)
- [typography.md](./typography.md) — typo 토큰·WebView 스케일·`<Typography>` API
- [navigation-chrome-policy.md](./navigation-chrome-policy.md) — chrome 노출 정책 (Tab/Stack × Mobile/Desktop)
- KRDS v1.0 — https://www.krds.go.kr

---

*최종 갱신: design system v1.1 — App Tone v1 visual direction, `(app)` scope*
