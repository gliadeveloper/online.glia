# Visual Direction — App Tone v1

`(app)` customer-facing UI의 **기본 시각 방향**. 신규 UI·디자인 요청 시 이 문서(또는 “**App Tone v1**”)만 언급하면 된다.

**상세 토큰·패턴:** [design-system.md](./design-system.md) · [typography.md](./typography.md) · [navigation-chrome-policy.md](./navigation-chrome-policy.md) · [policies.md](./policies.md)

---

## 한 줄 요청 (복붙)

> `(app)` **App Tone v1** / **design-system visual direction** 따라.

---

## App Tone v1 요약

| 축 | 규칙 |
|----|------|
| **Neutral chrome** | 탭·헤더·뒤로가기 **선택 상태**에 primary blue 사용 금지. active = `text-primary` + semibold + outline→filled icon |
| **Action blue** | **CTA 버튼·텍스트 링크·포커스 ring**만 `--color-action-primary` |
| **Border-first** | `--color-border` (카드·입력), `--color-border-subtle` (chrome 구분선). shadow는 `sm` 수준 |
| **Subtle motion** | 150–360ms, tap scale·icon crossfade·settle. `prefers-reduced-motion` 필수 |
| **Typography** | typo 토큰 / `<Typography role="…">`. Tailwind `text-sm`/`text-lg` 금지 |

---

## Canonical 참고 (코드)

| UI | 파일 |
|----|------|
| Bottom tab | `src/components/shell/primary-nav-bottom.tsx`, `nav-tab-item.tsx` |
| Home hero | `src/components/home/home-hero.tsx` (`HomeBrandHero`, `HomeHeroDesktop`) |
| Nav icons | `src/components/shell/nav-icons.tsx` (outline / filled pair) |
| Tab bar CSS | `src/app/globals.css` → `.nav-tab-bar`, `.nav-tab-item` |
| Typography | `src/components/typography/typography.tsx` |

---

## Chrome vs Action

| Neutral chrome (회색·진한 텍스트) | Action (blue 허용) |
|-----------------------------------|-------------------|
| Primary nav active | Primary CTA 버튼 |
| BackNav **제목** | BackNav **← 링크**, HeaderAuth 로그인 |
| Section heading | 본문 내 링크 |
| List row label | `:focus-visible` ring |

---

## Surface recipes

| 레벨 | Recipe |
|------|--------|
| **Page** | `bg-surface-muted` |
| **Panel / Card** | `surface-elevated` + `border` + `radius-md` |
| **Chrome bar** | frosted `surface-elevated` + `border-subtle` top + `nav-bar-shadow` + optional top radius |
| **Home feed** | `--radius-feed-panel` panel + list rows | `home-feed-panel.tsx` |

---

## Home Brand Hero (예외 패턴)

Tab **홈 `/`** 모바일 전용. Shell의 separated L0 대신 **`MobileGlobalHeader variant="on-hero"`** 가 Hero canvas top slot.

| 슬롯 | 내용 | 레이어 |
|------|------|--------|
| L0 on-hero | 앱명 + utility (검색·마이페이지) | L0 Global (integrated surface) |
| Hero copy | 인사 + 오늘 질문 + capsule CTA | L3 (hero zone) |
| Feed | Hero 아래 `surface-muted` + card stack | L3 |

**참고:** `HomeBrandHero` · `MobileGlobalHeader` · `.home-hero` in `globals.css`

Desktop `/`는 unified header + `HomeHeroDesktop` contained band.

---

## 적용 범위

- ✅ `src/app/(app)/`, `src/components/shell|home|community|learning|…` (customer `(app)` UI)
- ❌ `(customer)`, `admin`, `login` — 레거시. 신규 customer UI는 `(app)`만.

---

*App Tone v1 — neutral chrome + subtle motion, bottom tab 기준*
