# Typography Design System

`(app)` 영역과 WebView 임베드 웹을 위한 타이포그래피 규격.  
색·chrome 정책은 [design-system.md](./design-system.md), 내비게이션은 [navigation-chrome-policy.md](./navigation-chrome-policy.md)를 따른다.

---

## 1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **토큰 우선** | px 하드코딩 금지. `--typo-*` CSS 변수 또는 `<Typography>` / `typo-*` 클래스만 사용 |
| **계층 추상화** | 컴포넌트는 `typography5`, `subTypography11` 등 **토큰명**만 알면 됨. 기본 font-size·line-height를 외울 필요 없음 |
| **플랫폼 동기화** | iOS Dynamic Type·Android font scale과 WebView 웹 텍스트 비율을 맞춤 |
| **런타임 스케일** | 접근성 확대 시 CSS 변수만 갱신 — 컴포넌트 리렌더 불필요 |
| **시맨틱 분리** | `variant`(시각)와 `as`(HTML 시맨틱) 분리. heading level은 `as`로 결정 |

---

## 2. 토큰 계층 (100% 기준)

| Token | Size | Line Height | 용도 |
|-------|------|-------------|------|
| typography1 | 30 | 40 | 매우 큰 제목 |
| subTypography1–3 | 29–27 | 38–36 | sub — typography1 |
| typography2 | 26 | 35 | 큰 제목 |
| subTypography4–6 | 25–23 | 34–32 | sub — typography2 |
| typography3 | 22 | 31 | 일반 제목 |
| subTypography7 | 21 | 30 | sub — typography3 |
| typography4 | 20 | 29 | 작은 제목 |
| subTypography8 | 19 | 28 | sub — typography4 |
| subTypography9 | 18 | 27 | 조금 큰 본문 |
| typography5 | 17 | 25.5 | 일반 본문 (기본 body) |
| subTypography10 | 16 | 24 | sub — typography5 |
| typography6 | 15 | 22.5 | 작은 본문 |
| subTypography11 | 14 | 21 | 보조·라벨·버튼 |
| typography7 | 13 | 19.5 | 안 읽어도 됨 (본문 금지) |
| subTypography12 | 12 | 18 | 캡션·메타·nav label |
| subTypography13 | 11 | 16.5 | 아예 안 읽어도 됨 |

**SSOT:** `src/lib/typography/tokens.ts`

---

## 3. `(app)` 시맨틱 Role

Tailwind `text-sm` 등을 대체하는 **의도 기반** shortcut.

| Role | Token | 이전 Tailwind | 용도 |
|------|-------|---------------|------|
| `display` | typography2 | text-3xl | 히어로·디스플레이 |
| `pageTitle` | subTypography5 | text-2xl | Stack desktop h1 |
| `sectionTitle` | subTypography9 | text-lg | 섹션·카드 h2 |
| `contextTitle` | subTypography10 | text-base | Mobile BackNav h1 |
| `body` | typography5 | — | 기본 본문 |
| `bodyCompact` | subTypography10 | text-base | 입력·compact 본문 |
| `bodySecondary` | subTypography11 | text-sm | 보조 설명·버튼 |
| `label` | subTypography11 | text-sm | 폼 라벨 |
| `caption` | subTypography12 | text-xs | 배지·메타·bottom nav |
| `micro` | subTypography13 | — | 최소 장식 텍스트 |

#### Letter-spacing (KRDS 한글 정렬)

| Token | Value | 용도 |
|-------|-------|------|
| `--typo-tracking-display` | `-0.025em` | Hero greeting (`display`) |
| `--typo-tracking-title` | `-0.02em` | 섹션·panel 제목, L0 wordmark |
| `--typo-tracking-body` | `0` | 본문·버튼·링크 |
| `--typo-tracking-caption` | `0.012em` | 메타·날짜·부제 (소형 가독성) |

#### Home vertical rhythm (`--home-stack-*`)

`--radius-md`(8px) 배수: `xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 24

---

## 4. 사용 방법

### 4.1 `<Typography>` 컴포넌트 (권장 — 본문·제목)

```tsx
import { Typography } from "@/components/typography/typography";

<Typography as="h1" role="pageTitle" weight="semibold">
  페이지 제목
</Typography>

<Typography variant="typography5" color="secondary">
  본문 보조
</Typography>
```

| Prop | 값 |
|------|-----|
| `variant` | `typography1` … `subTypography13` |
| `role` | §3 시맨틱 role (`variant`보다 우선) |
| `as` | `h1`–`h6`, `p`, `span`, `label`, … |
| `color` | `primary` \| `secondary` \| `disabled` \| `action` \| `inherit` |
| `weight` | `regular` \| `medium` \| `semibold` \| `bold` |

### 4.2 CSS 클래스 (버튼·링크·레이아웃)

인터랙티브 요소는 `<Typography>` 대신 토큰 클래스를 `className`에 추가.

```tsx
import { typoRoleClass } from "@/lib/typography";

<button className={`shell-focus-ring min-h-11 ${typoRoleClass("bodySecondary")} font-medium`}>
  저장
</button>

// 또는 직접
<span className="typo-subTypography11">보조 텍스트</span>
```

### 4.3 Prose / Markdown

`.post-markdown`은 `typography5` 토큰 변수를 사용. compact 변형:

```tsx
<PostMarkdown content={body} className="typo-compact" />
```

---

## 5. 접근성 스케일 (더 큰 텍스트)

### 5.1 iOS — lookup table

9단계: `100%`, `Large`, `xLarge`, `xxLarge`, `xxxLarge`, `A11y_Medium`, `A11y_Large`, `A11y_xLarge`, `A11y_xxLarge`, `A11y_xxxLarge`

iOS WebView에서는 **scaleStep**을 브릿지로 전달. 웹은 `IOS_FONT_SIZE_TABLE`에서 font-size lookup, line-height는 비례 스케일.

### 5.2 Android — formula + cap

```
scaledFontSize = min(round(base × scalePercent × 0.01), maxFontSize)
```

토큰별 `maxFontSize`는 `tokens.ts` 참조 (예: typography1 → 42).

### 5.3 Web (현재)

기본 `100%`. DevTools 시뮬레이터 또는 Android 공식으로 QA.

---

## 6. WebView 네이티브 브릿지

### 6.1 초기 주입 (FOUC 방지)

**iOS WKWebView — page load 전:**

```javascript
window.__GLIA_TYPOGRAPHY__ = {
  platform: "ios",
  scaleStep: "xLarge"
};
```

**Android WebView:**

```javascript
window.__GLIA_TYPOGRAPHY__ = {
  platform: "android",
  scalePercent: 130
};
```

### 6.2 런타임 변경 — postMessage

```typescript
// 웹에서 수신하는 메시지 type
"GLIA_TYPOGRAPHY_SCALE"

// payload
{
  platform: "ios" | "android",
  scaleStep?: "xLarge",      // iOS
  scalePercent?: 130         // Android
}
```

**iOS:**

```swift
webView.evaluateJavaScript("""
  window.postMessage({
    type: 'GLIA_TYPOGRAPHY_SCALE',
    payload: { platform: 'ios', scaleStep: '\(step)' }
  }, '*');
""")
```

**Android:**

```kotlin
webView.evaluateJavascript("""
  window.postMessage({
    type: 'GLIA_TYPOGRAPHY_SCALE',
    payload: { platform: 'android', scalePercent: $scale }
  }, '*');
""", null)
```

### 6.3 직접 호출

```javascript
window.__GLIA_APPLY_TYPOGRAPHY__?.({
  platform: "android",
  scalePercent: 150
});
```

---

## 7. 아키텍처

```
Native App
  └─ window.__GLIA_TYPOGRAPHY__ / postMessage
       └─ TypographyScaleProvider (root layout)
            └─ applyTypographyScale() → :root CSS variables
                 └─ .typo-* / <Typography> / body default
```

| 파일 | 역할 |
|------|------|
| `src/lib/typography/tokens.ts` | 토큰·iOS table·semantic roles |
| `src/lib/typography/scale.ts` | iOS lookup / Android formula |
| `src/lib/typography/apply-scale.ts` | `:root` CSS 변수 적용 |
| `src/lib/typography/native-bridge.ts` | WebView 메시지·전역 API |
| `src/lib/typography/typography-scale-provider.tsx` | React context |
| `src/components/typography/typography.tsx` | `<Typography>` |
| `src/components/typography/typography-root-provider.tsx` | Root wrapper |
| `src/app/globals.css` | `.typo-*` 유틸·기본 변수 |

---

## 8. DevTools 시뮬레이터

개발 환경에서 URL에 `?typography-debug=1` 추가.

- **Platform:** web / ios / android
- **iOS:** scale step dropdown
- **Android / web:** scale % slider (100–310)

설정은 `localStorage` key `glia-typography-debug`에 저장.

---

## 9. 적용 범위

| 영역 | 상태 |
|------|------|
| `(app)` — shell·홈·커뮤니티·학습·마이페이지 등 | ✅ typo 토큰 적용 |
| `body` 기본 font | typography5 |
| `.post-markdown` | typography5 + 토큰 기반 heading |
| `(customer)` / `admin` / `login` | ❌ 레거시 Tailwind text-* 유지 |

신규 `(app)` UI는 **반드시** typo 토큰 또는 `<Typography>` 사용.

---

## 10. 금지·지양

| 항목 | 이유 |
|------|------|
| `text-sm`, `text-lg` 등 Tailwind font-size in `(app)` | 토큰·스케일 파이프라인 우회 |
| px font-size 하드코딩 | Dynamic Type / Android scale 미대응 |
| typography7 이하를 본문에 사용 | 가독성·KRDS 정책 (14px 미만 본문 금지) |
| shell 높이까지 typography scale | `--header-height` 등 chrome은 고정, 텍스트만 스케일 |

---

## 11. 마이그레이션 매핑 (참고)

| Legacy Tailwind | Typo class | Role |
|-----------------|------------|------|
| text-3xl | typo-typography2 | display |
| text-2xl | typo-subTypography5 | pageTitle |
| text-lg | typo-subTypography9 | sectionTitle |
| text-base | typo-subTypography10 | contextTitle / bodyCompact |
| text-sm | typo-subTypography11 | bodySecondary |
| text-xs | typo-subTypography12 | caption |

---

*최종 갱신: typography v1 — WebView-ready token system, `(app)` scope*
