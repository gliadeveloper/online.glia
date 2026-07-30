# 내비게이션 · Chrome 정책

온라인 학습 앱의 화면 프레임(헤더, 탭, 뒤로가기)을 **어떤 기준으로 보이고 숨길지** 정의한다.  
KRDS v1.0 접근성 가이드를 전제로 하며, viewport와 화면 깊이(depth)에 따라 chrome 구성이 달라진다.

**설계 철학:** UI chrome·IA는 **업계에서 검증된 패턴**을 채택하고, 이 문서는 그 패턴의 **노출 규칙·프로젝트 용어**만 정의한다. (브랜드·카피 창작 최소화)

---

## 0. Adopted patterns (업계 표준 ↔ 우리 용어)

| 업계 패턴 | 우리 구현 | 비고 |
|-----------|-----------|------|
| **Root tabs / Primary destinations** | Tab mode `(tabs)/` | 홈·커뮤니티·내학습 |
| **Hierarchical nav / Drill-down stack** | Stack mode `(stack)/` | 상세·폼·마이페이지 |
| **Bottom tab bar** | `PrimaryNavBottom` | Mobile Tab only |
| **Top navigation / Unified app header** | `UnifiedHeader` | Desktop Tab & Stack |
| **App bar / Top app bar** | `MobileGlobalHeader` variant **`separated`** | Mobile Tab (홈 제외) |
| **Immersive header on hero surface** | `MobileGlobalHeader` variant **`on-hero`** | Mobile Tab **홈 `/` only** |
| **Immersive detail / Context header** | `BackNav` | Mobile Stack only |
| **Feed home / Dashboard landing** | `HomeBrandHero` + feed | Mobile 홈 |
| **Home Brand Hero** | gradient canvas + `--radius-hero-bottom` → feed | L0 **역할**은 global, **surface**는 hero에 integrated |
| **App shell scroll** | `100dvh` flex shell + `#main-content` scroll | Mobile `(app)` only · desktop은 document scroll |

---

## 1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **Chrome은 리소스다** | 로고·메뉴·인증 UI는 항상 노출하는 장식이 아니라, 사용자의 현재 과업에 맞게 켜고 끄는 탐색 수단이다. |
| **모드가 먼저, viewport가 그다음** | 화면이 Tab(루트)인지 Stack(하위·작업)인지를 먼저 정하고, 그다음 모바일/PC에서 어떤 chrome slot을 쓸지 결정한다. |
| **브랜드 자리는 유지, 카피는 미정** | 로고·슬로건 **영역(placeholder)** 은 남기되, 특정 브랜드명·슬로건 문구는 확정 전까지 넣지 않는다. |
| **접근성은 정책의 일부** | 건너뛰기 링크, `aria-current`, 포커스 링, 터치 타깃 44px 등은 chrome 정책과 함께 적용한다. |

---

## 2. 정보 구조 (IA)

### 2.1 1차 메뉴 (Primary Navigation)

고정 3개. 추가·변경 시 이 문서를 먼저 갱신한다.

| 메뉴 | 경로 | 역할 |
|------|------|------|
| 홈 | `/` | 진입·요약·주요 CTA |
| 커뮤니티 | `/community` | 공지·Q&A 등 (확장 예정) |
| 내학습 | `/learning` | 수강·코칭·체크인 등 학습 허브 (확장 예정) |

### 2.2 내비게이션 모드 (Navigation Mode)

| 모드 | 이름 | 사용자 질문 | 라우트 그룹 |
|------|------|-------------|-------------|
| **Tab** | Root / L1 | 「앱 어디로 갈까?」 | `(tabs)` |
| **Stack** | Detail / Task / L2~L3 | 「이 일을 끝내거나 한 단계 나갈까?」 | `(stack)` |

**Tab에 둘 화면**

- 1차 메뉴 3개에 해당하는 루트 페이지
- 사용자가 섹션 간 이동을 기대하는 허브

**Stack에 둘 화면**

- 목록 → 상세 → 작성/수정처럼 **한 단계 깊어지는** 흐름
- 폼 작성·설정·마이페이지 등 **단일 과업 집중** 화면

### 2.3 현재 Stack 라우트

| 경로 | 깊이 | 설명 |
|------|------|------|
| `/checkin` | L2 | 체크인 허브 (데일리 · 주간 탭) |
| `/checkin/daily` | L2 | → `/checkin?tab=daily` redirect |
| `/checkin/daily/[date]` | L3 | 데일리 체크 작성·수정 |
| `/checkin/weekly/[date]` | L3 | 주간 체크 작성·수정 |
| `/mypage` | L2 | 마이페이지 |

홈 hero CTA는 오늘 데일리 폼(`/checkin/daily/{today}`)으로 직행. 주간은 `/checkin?tab=weekly`에서 discover.

---

## 3. Chrome 레이어

화면 프레임을 4개 레이어로 나눈다. 정책은 **어떤 레이어를 어떤 조건에서 노출할지**를 규정한다.

| 레이어 | ID (개념) | 구성 | 역할 |
|--------|-----------|------|------|
| **L0 Global** | global | 로고(placeholder) · 슬로건(placeholder) · 인증(로그인/마이페이지) | 앱 정체성·전역 계정 |
| **L1 Primary** | primary | 홈 · 커뮤니티 · 내학습 | 섹션 간 이동 |
| **L2 Context** | context | ← 뒤로 · 페이지 제목 | 계층 내 이전 단계 |
| **L3 Content** | main | 페이지 본문 | 과업·정보 |

**L0 surface variants (Mobile Tab)**

| Variant | 경로 | Surface | 구현 |
|---------|------|---------|------|
| **`on-hero`** | `/` only | Hero gradient에 integrated, border 없음 | `MobileGlobalHeader variant="on-hero"` in `HomeBrandHero` |
| **`separated`** | `/community`, `/learning` | elevated bar + `border-b` | `MobileGlobalHeader` in shell |
| *(off)* | Stack | L0 숨김 | — |

---

## 4. Chrome Policy Table

**핵심 표.** viewport × navigation mode 조합별로 어떤 chrome이 보이는지 정의한다.

### 4.1 Tab 모드 (Root / L1)

| Chrome | Mobile | Desktop (lg+) |
|--------|--------|---------------|
| L0 Global `[로고 + 인증]` | ✅ 상단 variant **`separated`** (**홈 `/` 제외**) | — |
| **Home Brand Hero** | ✅ **`/` only** — L0 **`on-hero`** + hero copy/CTA + **`radius-hero-bottom`** → feed | — (contained hero band) |
| L1 Primary `[홈·커뮤니티·내학습]` | ✅ **하단 탭** | ✅ **헤더 내 인라인** |
| L0+L1 통합 `[로고 + 메뉴 + 인증]` | — | ✅ **단일 헤더 한 줄** |
| L2 Context `← + 제목` | ❌ | ❌ |
| 본문 스크롤 | `#main-content` 단일 scroll (§4.4) | document scroll |
| 본문 하단 여백 (바텀 탭 대응) | ❌ (탭은 scroll 밖) | ❌ |

**Mobile Tab 요약:** 홈은 `HomeBrandHero`(L0 on-hero + hero + feed), 그 외 Tab은 상단 `[로고 + 인증] separated` + 하단 `[1차 메뉴]`

**Desktop Tab 요약:** 상단 `[로고 + 1차 메뉴 + 인증]` 한 줄

---

### 4.2 Stack 모드 (Detail / Task / L2~L3)

| Chrome | Mobile | Desktop (lg+) |
|--------|--------|---------------|
| L0 Global `[로고 + 인증]` | ❌ | — |
| L1 Primary | ❌ | ✅ **헤더 내 인라인** (통합 헤더에 포함) |
| L0+L1 통합 `[로고 + 메뉴 + 인증]` | — | ✅ **단일 헤더 한 줄** |
| L2 Context `← + 제목` | ✅ **유일한 상단 chrome** | ❌ |
| 본문 하단 여백 (바텀 탭 대응) | ❌ | ❌ |

**Mobile Stack 요약:** 상단 `[← 뒤로 + 제목]` 만 (immersive). 로고·인증·바텀 탭 모두 숨김.

**Desktop Stack 요약:** 상단 `[로고 + 1차 메뉴 + 인증]` 만. BackNav(←+제목) **없음**.  
→ PC에서는 unified header + 브라우저/링크 탐색으로 depth 이탈.

---

### 4.3 한눈에 보기

```
                    Mobile Tab          Mobile Stack         Desktop (Tab & Stack)
                    ──────────          ────────────         ─────────────────────
Global (로고+인증)   ✅ top              ❌                   (통합 헤더에 포함)
Primary (1차 메뉴)   ✅ bottom           ❌                   ✅ header inline
Context (←+제목)     ❌                   ✅ top (only)        ❌
Scroll               main only            main only            document
```

---

### 4.4 Mobile scroll (App shell)

Mobile `(app)` (`AdaptiveShell`)은 **앱형 웹** scroll 모델을 쓴다. Desktop (`lg+`)은 document scroll을 유지한다.

| 속성 | Mobile | Desktop |
|------|--------|---------|
| Shell | `height: 100dvh` flex column · `overflow: hidden` | `min-h-screen` · document scroll |
| `html`/`body` | `:has(.app-shell)` → `overflow: hidden` | 기본 |
| Scroll container | `#main-content.app-shell__main` only | window |
| Top chrome | `app-shell__chrome` (scroll 밖) | sticky unified header |
| Bottom tab | `app-shell__chrome` (scroll 밖, `fixed` 아님) | — |
| Overscroll | `overscroll-behavior: none` on main (바운스·pull-to-refresh 차단) | browser default |
| Scrollbar | hidden on main (`scrollbar-width: none` · `::-webkit-scrollbar`) | browser default |
| Route change | `main` scrollTop → 0 | browser default |

**구현:** `adaptive-shell.tsx` · `globals.css` (`.app-shell*`) · `PrimaryNavBottom`

**로그인·admin·`(customer)` 등 `AdaptiveShell` 밖**은 document scroll — `:has(.app-shell)` 미적용.

---

## 5. Context Navigation (뒤로가기) 정책

L2 Context Nav는 **Mobile Stack에서만** 노출한다.

| 현재 경로 | 뒤로 라벨 | 이동 대상 | 제목 |
|-----------|-----------|-----------|------|
| `/mypage` | 홈 | `/` | 마이페이지 |
| `/checkin` | 홈 | `/` | 체크인 |
| `/checkin/daily/[date]` | 체크인 | `/checkin?tab=daily` | 데일리 체크 |
| `/checkin/weekly/[date]` | 체크인 | `/checkin?tab=weekly` | 주간 체크 |

**규칙**

- 뒤로 링크는 **한 단계 위** 또는 **논리적 부모**로만 연결한다.
- 선택 상태는 색상만 쓰지 않고, 밑줄·굵기·아이콘 등 형태 단서를 병행한다 (KRDS).
- PC Stack에서는 context bar를 두지 않는다. 페이지 본문 내 제목·링크로 맥락을 제공한다.

---

## 6. 인증 UI 정책

| 상태 | 헤더 우측 표시 | 동작 |
|------|----------------|------|
| 비로그인 | 로그인 | `/login?next={현재경로}` |
| 로그인 | 마이페이지 | `/mypage` (Stack) |

- Mobile Stack(immersive)에서는 인증 버튼을 **숨긴다**. 로그인·마이페이지는 Tab 루트 또는 PC unified header에서 접근한다.
- Stack 중 로그인 필수 페이지(`/mypage`, `/checkin/*`)는 미로그인 시 login으로 redirect한다.

---

## 7. 건너뛰기 링크 (Skip Links)

| 모드 | 제공 링크 |
|------|-----------|
| Tab | 본문 바로가기 · 주요 메뉴 바로가기 |
| Stack (mobile) | 본문 바로가기 · 이전 단계 바로가기 |
| Stack (desktop) | 본문 바로가기 · 주요 메뉴 바로가기 (unified header) |

---

## 8. 브랜드 Placeholder 정책

| 요소 | 정책 |
|------|------|
| 로고 | 점선 placeholder 박스. `aria-label="서비스 로고"`. 클릭 시 `/`. |
| 슬로건 | 시각 placeholder 바. `sr-only`로 「서비스 슬로건」 제공. |
| 브랜드명 | UI에 특정 상호(Glia 등) **표기하지 않음**. 확정 후 에셋·카피만 교체. |

---

## 9. 신규 화면 추가 시 결정 절차

1. **1차 메뉴 3개에 넣을 수 있는가?**  
   - Yes → Tab `(tabs)/`  
   - No → 2번

2. **목록·상세·작성처럼 깊어지는가, 또는 단일 과업인가?**  
   - Yes → Stack `(stack)/`  
   - No → Tab 또는 홈 하위 카드로 진입만 제공

3. **Stack이면 context nav 매핑 추가**  
   - `backHref`, `backLabel`, `title` 정의

4. **이 문서의 Policy Table에 해당하는지 확인**  
   - Mobile Stack이면 L0·L1 숨김, L2만 노출되는지

---

## 10. KRDS 정렬 요약

| KRDS 컴포넌트 | 적용 |
|---------------|------|
| 건너뛰기 링크 | Tab/Stack별 skip links |
| 헤더 | Unified / Mobile Global / Context |
| 탭바 | Mobile Tab bottom primary |
| 메인 메뉴 | Desktop inline primary |
| 버튼·링크 | `:focus-visible` 3px, min 44px 터치 |
| 선택 상태 | outline/filled icon + font-weight + `aria-current="page"` |

---

## 11. 용어집

| 용어 | 정의 |
|------|------|
| **Chrome** | 로고·헤더·탭·뒤로가기 등 콘텐츠를 제외한 UI 프레임 |
| **Tab mode** | 1차 섹션 탐색 모드 (Root) |
| **Stack mode** | 계층·과업 깊이 모드 (Detail/Task) |
| **Unified header** | PC에서 `[로고 + 1차 메뉴 + 인증]` 한 줄 |
| **Immersive context** | Mobile Stack에서 global·primary를 내리고 context만 남기는 상태 |
| **L0 on-hero** | Mobile Tab 홈: L0가 Hero surface에 integrated (separated bar 아님) |
| **L0 separated** | Mobile Tab 기본: app bar + border로 본문과 분리 |
| **Chrome budget** | 한 viewport에 동시에 올릴 수 있는 chrome 양 |
| **App shell scroll** | Mobile: chrome 고정 + `#main-content` 단일 scroll (`100dvh`) |

---

## 12. 관련 문서

- [visual-direction.md](./visual-direction.md) — App Tone v1 visual direction
- [design-system.md](./design-system.md) — 색·타이포·컴포넌트 패턴·접근성 (시각 디자인 시스템)
- KRDS v1.0 — https://www.krds.go.kr

---

*최종 갱신: navigation chrome policy v1 — Tab/Stack × Mobile/Desktop matrix 기준*
