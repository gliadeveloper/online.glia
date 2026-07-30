# Color Palette

`(app)` primitive color tokens. **SSOT:** `src/app/design-tokens/palette.css`

시맨틱 토큰(`--color-text-primary` 등)은 이 팔레트를 참조한다.  
UI 구현 시 **primitive 직접 사용보다 시맨틱 토큰 우선** — [design-system.md §2](./design-system.md#21-색상--primitive-palette).

---

## Grey

| Token | Hex |
|-------|-----|
| `--color-grey-50` | `#f9fafb` |
| `--color-grey-100` | `#f2f4f6` |
| `--color-grey-200` | `#e5e8eb` |
| `--color-grey-300` | `#d1d6db` |
| `--color-grey-400` | `#b0b8c1` |
| `--color-grey-500` | `#8b95a1` |
| `--color-grey-600` | `#6b7684` |
| `--color-grey-700` | `#4e5968` |
| `--color-grey-800` | `#333d4b` |
| `--color-grey-900` | `#191f28` |

## Blue

| Token | Hex |
|-------|-----|
| `--color-blue-50` | `#e8f3ff` |
| `--color-blue-100` | `#c9e2ff` |
| `--color-blue-200` | `#90c2ff` |
| `--color-blue-300` | `#64a8ff` |
| `--color-blue-400` | `#4593fc` |
| `--color-blue-500` | `#3182f6` |
| `--color-blue-600` | `#2272eb` |
| `--color-blue-700` | `#1b64da` |
| `--color-blue-800` | `#1957c2` |
| `--color-blue-900` | `#194aa6` |

## Red

| Token | Hex |
|-------|-----|
| `--color-red-50` | `#ffeeee` |
| `--color-red-100` | `#ffd4d6` |
| `--color-red-200` | `#feafb4` |
| `--color-red-300` | `#fb8890` |
| `--color-red-400` | `#f66570` |
| `--color-red-500` | `#f04452` |
| `--color-red-600` | `#e42939` |
| `--color-red-700` | `#d22030` |
| `--color-red-800` | `#bc1b2a` |
| `--color-red-900` | `#a51926` |

## Grey opacity

| Token | Value |
|-------|-------|
| `--color-grey-opacity-50` | `#001733` @ 2% |
| `--color-grey-opacity-100` | `#022047` @ 5% |
| `--color-grey-opacity-200` | `#001b37` @ 10% |
| `--color-grey-opacity-300` | `#001d3a` @ 18% |
| `--color-grey-opacity-400` | `#001936` @ 31% |
| `--color-grey-opacity-500` | `#031832` @ 46% |
| `--color-grey-opacity-600` | `#00132b` @ 58% |
| `--color-grey-opacity-700` | `#031228` @ 70% |
| `--color-grey-opacity-800` | `#000c1e` @ 80% |
| `--color-grey-opacity-900` | `#020913` @ 91% |

CSS: `rgb(R G B / alpha)` — see `palette.css`.

## Orange

| Token | Hex |
|-------|-----|
| `--color-orange-50` … `--color-orange-900` | `#fff3e0` … `#e45600` |

## Yellow

| Token | Hex |
|-------|-----|
| `--color-yellow-50` … `--color-yellow-900` | `#fff9e7` … `#dd7d02` |

## Green

| Token | Hex |
|-------|-----|
| `--color-green-50` … `--color-green-900` | `#f0faf6` … `#027648` |

## Teal

| Token | Hex |
|-------|-----|
| `--color-teal-50` … `--color-teal-900` | `#edf8f8` … `#076565` |
| `--color-teal-brand` | `#1e839e` (home hero) |

## Purple

| Token | Hex |
|-------|-----|
| `--color-purple-50` … `--color-purple-900` | `#f9f0fc` … `#65237b` |

---

## Semantic mapping (Light)

| Semantic | Primitive |
|----------|-----------|
| `--color-text-primary` | `--color-grey-900` |
| `--color-text-secondary` | `--color-grey-700` |
| `--color-text-disabled` | `--color-grey-500` |
| `--color-action-primary` | `--color-blue-500` |
| `--color-action-primary-hover` | `--color-blue-600` |
| `--color-border` | `--color-grey-300` |
| `--color-border-subtle` | `--color-grey-200` |
| `--color-border-strong` | `--color-grey-600` |
| `--color-surface` | `#ffffff` |
| `--color-surface-muted` | `--color-grey-100` |
| `--color-surface-elevated` | `#ffffff` |
| `--color-focus-ring` | `--color-blue-500` |

### Status feedback (권장)

| 상태 | Background | Text |
|------|------------|------|
| success | `--color-green-50` | `--color-green-800` |
| warning | `--color-yellow-50` | `--color-yellow-900` |
| error | `--color-red-50` | `--color-red-800` |
| info | `--color-blue-50` | `--color-blue-900` |

---

## Usage

```css
/* ✅ Semantic (preferred) */
color: var(--color-text-primary);

/* ✅ Primitive when semantic does not exist */
background: var(--color-teal-100);

/* ❌ Hardcoded hex in components */
color: #191f28;
```

CSS 변수: `var(--color-grey-900)` · Tailwind arbitrary: `bg-[var(--color-grey-100)]`

---

## Home `/` tokens

`src/app/design-tokens/home-colors.css`

| Token | Light source |
|-------|----------------|
| `--color-hero-brand` | `teal-brand` |
| `--color-hero-from` / `--color-hero-to` | `teal-brand` → `surface` mix |
| `--color-hero-cta-text` | `teal-700` |
| `--color-home-canvas` | `grey-100` |
| `--color-home-panel-*` | `surface` + `grey-200` border |
| `--color-home-row-*` | `grey-50`–`grey-200` |
| Shadows | `grey-opacity-100` |
