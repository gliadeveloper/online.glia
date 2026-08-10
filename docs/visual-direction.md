# Visual Direction — Corporate Trust

`(app)` customer-facing UI의 **기본 시각 방향**. 신규 UI·디자인 요청 시 **「Corporate Trust」** 또는 **「corp-trust」**만 언급하면 된다.

**구현 SSOT:** `src/components/corporate-trust/` · `src/components/shell/*-trust.css`

---

## 한 줄 요청 (복붙)

> `(app)` **Corporate Trust** / **corp-trust tokens** 따라.

---

## Corporate Trust 요약

| 축 | 규칙 |
|----|------|
| **Accent** | indigo gradient (`--auth-primary` / `--auth-secondary`) — active nav pill, CTA, links |
| **Typography** | Plus Jakarta (`CorpTrustScope`), typo 토큰 / `<Typography role="…">` |
| **Surfaces** | `--auth-bg`, `--auth-surface`, `--auth-border-subtle`, card shadow `--auth-shadow-card` |
| **Page headers** | `TabPageHeader` — tab L3 + stack L3 intro band |
| **Buttons** | `TrustButton`, `TrustButtonLink`, `corp-trust-btn-*` |
| **Motion** | 150–360ms; `prefers-reduced-motion` 필수 |

---

## Canonical 참고 (코드)

| UI | 파일 |
|----|------|
| Scope root | `src/components/corporate-trust/corp-trust-scope.tsx` |
| Tokens + overrides | `tokens.css`, `app-trust-tokens.css` |
| UI primitives | `app-trust-ui.tsx` |
| Page header | `tab-page-header.tsx` |
| Bottom / inline nav | `primary-nav-trust.css`, `primary-nav-inline.tsx`, `primary-nav-bottom.tsx` |
| Shell chrome | `shell-chrome-trust.css`, `mobile-global-header.tsx`, `brand-mark.tsx` |
| Home hero | `home-hero.tsx` + corp-trust home overrides |

---

## Surface recipes

| 레벨 | Recipe |
|------|--------|
| **Page** | `--auth-bg` |
| **Panel / Card** | `--auth-surface` + `--auth-border-subtle` + `radius-md` + `--auth-shadow-card` |
| **Chrome bar** | frosted white + subtle border + gradient active pill (nav) |
| **Home feed** | trust card stack · `home-feed-panel.tsx` |

---

## Home Brand Hero

Tab **홈 `/`** 모바일: `MobileGlobalHeader variant="on-hero"` + indigo gradient hero.

Desktop: unified header + `HomeHeroDesktop` contained band.

---

## 적용 범위

- ✅ `src/app/(app)/` + related components (CorpTrustScope)
- ✅ Shop stack — nested `ShopTrustScope`
- ✅ Auth `(auth)/` — separate auth trust scope
- ❌ `admin`, `(customer)` — 별도 톤

---

*Corporate Trust — indigo gradient chrome, Plus Jakarta, bottom tab 기준*
