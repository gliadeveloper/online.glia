# Open Graph(OG) 메타 태그 가이드

> **대상 스택:** Next.js **16.2** App Router · React 19 · 이 레포 (`online.glia`)  
> **근거:** [Open Graph protocol](https://ogp.me/) · [Next.js 16 Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) (문서 버전 16.3, 2026-08) · [opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)  
> **목적:** 오픈 전, 페이지 특성별로 OG를 어떻게 넣을지 한 장으로 고정한다.  
> **최종 갱신:** 2026-08-23

이 문서는 **구현 스펙**이다. 색·레이아웃이 아니라 **링크가 카카오톡·X·Slack·iMessage·검색 스크래퍼에 어떻게 보이는가**만 다룬다.

---

## 0. 한 줄로

소셜/메신저 미리보기는 HTML `<head>`의 OG 태그를 읽는다. Next.js 16에서는 `<Head>`를 쓰지 않고, `layout.tsx` / `page.tsx`에서 `metadata` 또는 `generateMetadata`를 export한다. **페이지 특성(브랜드 / 상품 / 글 / 비공개)** 에 따라 `og:type`·이미지·index 여부가 달라진다.

---

## 1. OG가 하는 일과 하지 않는 일

| 하는 일 | 하지 않는 일 |
|---------|--------------|
| 링크 미리보기 제목·설명·이미지 | 구글 리치 결과(별점, 가격) — 그건 **JSON-LD** |
| 카카오톡·X·Facebook·Slack·Discord 카드 | 앱 안 화면 UI |
| canonical URL을 그래프의 영구 ID로 고정 | 로그인 세션 개인화 미리보기 |

검색용 `<title>` / `description` / `robots`와 **같이** 넣되, 역할은 분리한다.

| 채널 | 읽는 필드 |
|------|-----------|
| 카카오톡 스크랩 | `og:title` · `og:description` · `og:image` · `og:site_name` |
| X (Twitter) | `twitter:card` + `twitter:title` · `description` · `image` (없으면 OG fallback) |
| Facebook / Meta | OG 전체 + (선택) `fb:app_id` |
| Slack / Discord / iMessage | OG |
| Google 검색 | `<title>` · `description` · canonical · JSON-LD. OG는 보조 |

이 서비스의 주 공유 채널은 **카카오톡**이다. 이미지를 카카오 크롭(2:1, 내부적으로 800×400)에 맞춰 설계한다.

---

## 2. 프로토콜 필수 필드 (ogp.me)

모든 공개 페이지에 아래 4개는 **빠지면 미리보기가 깨진다.**

| 속성 | 의미 | 이 프로젝트 규칙 |
|------|------|------------------|
| `og:title` | 카드에 보이는 제목 | 사이트명 suffix **넣지 않음**. suffix는 `og:site_name` / `<title>` template가 담당 |
| `og:type` | 객체 종류 | 특성별 — [§5](#5-페이지-특성-분류-이-사이트) |
| `og:image` | 대표 이미지 **절대 URL** | 1200×630, HTTPS, 8MB 이하. [§7](#7-og-이미지) |
| `og:url` | 이 객체의 영구 URL | query string·utm **없는** canonical |

권장 공통 필드:

| 속성 | 쓰는 이유 |
|------|-----------|
| `og:description` | 1~2문장. 카카오는 약 2줄 |
| `og:site_name` | 카드 하단에 `GLIA` |
| `og:locale` | `ko_KR` |
| `og:image:width` / `height` / `alt` / `type` | 크롤러가 레이아웃을 추측하지 않게 |
| `twitter:card` | `summary_large_image` (공개 마케팅·상품·글) |

ogp.me 글로벌 타입 중 이 사이트에 해당하는 것:

| `og:type` | 언제 |
|-----------|------|
| `website` | 홈, 목록, 랜딩, 상품 상세, 인증 화면. **기본값** |
| `article` | 커뮤니티 공개 글 (`/community/[slug]`) |
| `profile` | 쓰지 않음 (회원 프로필은 비공개·공유 대상 아님) |

`product` 타입은 ogp.me 글로벌 목록에 **없다.** Facebook Commerce 확장이다. 상품 페이지는 `og:type: website` + **JSON-LD `Product`** 로 간다 ([§10](#10-json-ld-검색용-og와-역할-분리)).

---

## 3. Next.js 16에서 넣는 방법 (2026)

### 3.1 두 export — 한 세그먼트에 하나만

| API | 언제 |
|-----|------|
| `export const metadata` | 값이 빌드/코드에 고정 (로그인, 마이페이지 레이아웃, 이벤트 랜딩) |
| `export async function generateMetadata` | URL param / DB 값이 필요 (상품, 커뮤니티 글) |

같은 `page.tsx` / `layout.tsx`에서 **둘 다 export하면 안 된다.** Server Component에서만 동작한다. Client 로직은 자식 컴포넌트로 분리한다.

### 3.2 `params`는 Promise (v16)

Next.js 16부터 `params` / `searchParams`는 Promise다. `await` 없이 쓰면 깨진다.

```ts
import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return {};
  return { title: product.title };
}
```

페이지와 `generateMetadata`가 같은 `fetch` / Prisma 조회를 하면 Next.js가 `fetch`를 메모하고, Prisma는 `React.cache`로 한 번만 치게 묶는다.

`notFound()` / `redirect()`는 `generateMetadata` 안에서도 쓸 수 있다. 없는 상품은 빈 객체를 돌려 부모 fallback을 쓰기보다 **`notFound()`** 가 맞다.

### 3.3 루트에 반드시 `metadataBase`

상대 경로 이미지(`/og/default.png`)는 `metadataBase` 없이 빌드 에러가 난다. 크롤러는 **절대 HTTPS URL**만 신뢰한다.

이 레포의 공개 origin은 이미 `APP_URL` / `KAKAO_REDIRECT_URI`로 맞추는 [`getRequestOrigin`](../src/lib/request-origin.ts)이 있다. 메타용으로는 요청 헤더에 의존하지 않는 **고정 origin**이 필요하다.

```ts
// src/lib/site-metadata.ts  (신설 예정)
export const SITE_NAME = "GLIA";
export const SITE_URL = new URL(
  process.env.APP_URL ?? "https://online.glia.kr",
);

export function absoluteUrl(path: string) {
  return new URL(path, SITE_URL).toString();
}
```

```ts
// src/app/layout.tsx
export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: "GLIA — 몸의 신호를 읽고 스스로 조절하는 온라인",
    template: "%s | GLIA",
  },
  description: "신경 기반 몸 관리를 온라인에서. 강의·코칭·체크인.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    title: "GLIA",
    description: "신경 기반 몸 관리를 온라인에서. 강의·코칭·체크인.",
    url: "/",
    images: [{ url: "/og/default.png", width: 1200, height: 630, alt: "GLIA" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};
```

`title.template`은 **자식 세그먼트에만** 적용된다. 루트 layout의 `title.default`는 템플릿을 타지 않는다. 특정 페이지에서 suffix를 빼고 싶으면 `title: { absolute: "…" }`.

### 3.4 병합은 shallow — `openGraph` 통째로 덮어씀

자식이 `openGraph: { title }`만 주면 **부모의 `images` / `description`까지 사라진다.** 페이지에서 `openGraph`를 쓰는 순간, 필요한 필드를 전부 다시 적거나 공통 조각을 spread 한다.

```ts
// src/lib/site-metadata.ts
export const defaultOgImages = [
  { url: "/og/default.png", width: 1200, height: 630, alt: "GLIA" },
];
```

파일 기반 `opengraph-image`는 config보다 **우선**한다. 같은 세그먼트에 둘 다 있으면 파일이 이긴다.

### 3.5 파일 컨벤션 vs config

| 방법 | 적합한 곳 |
|------|-----------|
| `app/opengraph-image.png` + `opengraph-image.alt.txt` | 사이트 기본 이미지 (한 장 고정) |
| `app/event1/opengraph-image.png` | 캠페인 전용 고정 컷 |
| `opengraph-image.tsx` + `ImageResponse` (`next/og`) | 상품명·글 제목을 박은 동적 카드 |
| `metadata.openGraph.images` | DB/R2에 이미 있는 커버 URL |

동적 이미지 파일의 `params`도 Promise다 (v16.0). 기본 사이즈 export:

```ts
export const alt = "GLIA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
```

파일 크기 제한: `opengraph-image` 8MB, `twitter-image` 5MB. 초과하면 **빌드 실패**.

### 3.6 Streaming metadata와 카카오 봇

Next.js 15.2+는 `generateMetadata`가 느려도 UI를 먼저 보내고, 메타는 나중에 `<head>`에 붙인다. **JS를 실행하는 봇(Googlebot)** 은 괜찮다.

카카오·Facebook·X 스크래퍼는 HTML만 본다 (`facebookexternalhit` 등). Next.js는 이런 UA를 감지하고 **메타가 준비될 때까지 응답을 막는다.** 기본 목록이면 추가 설정은 필요 없다.

루트 layout이 `dynamic = "force-dynamic"`이므로 이 앱의 메타는 요청 시점에 계산된다. 공개 상품/글 메타는 세션에 의존하지 말 것 — 크롤러는 쿠키가 없다.

### 3.7 쓰지 말 것

| 금지 | 이유 |
|------|------|
| `next/head` | App Router에서 레거시. Metadata API가  Dedup·병합을 담당 |
| Client Component에서 `metadata` export | 서버에서만 해석 |
| `metadata.viewport` / `themeColor` | Next 14+ deprecated → `export const viewport` / `generateViewport` |
| 상대 경로 OG 이미지 + `metadataBase` 없음 | 빌드 에러 또는 깨진 카드 |
| 로그인 뒤에만 있는 OG | 스크래퍼가 `/login`을 긁음 — [§8](#8-로그인-벽과-크롤러) |

---

## 4. 카피·길이 규칙

한글 기준. 카드는 잘린다. **앞 20자에 핵심.**

| 필드 | 권장 | 상한(잘림 시작) |
|------|------|-----------------|
| `<title>` | 28~40자 | ~60자 |
| `og:title` | 18~32자, 브랜드명 제외 | 카카오 2줄 |
| `description` / `og:description` | 70~110자, 한 문장 + 가치 | ~160자 (검색), 카카오 2줄 |
| `og:image:alt` | 이미지에 보이는 텍스트와 같게 | — |

규칙:

- 제목 끝 `... | GLIA`는 `<title>`에만. OG 제목은 본문 제목 그대로.
- 설명에 가격·할인·날짜를 넣을 거면 **앞쪽**. 잘려도 의미가 남게.
- 의료 주장 금지. 이 프로그램은 치료가 아니다 (`event1` 카피와 동일).
- UTM·내부 토큰을 `og:url`에 넣지 않는다. 공유 URL = canonical.

---

## 5. 페이지 특성 분류 (이 사이트)

공유 의도와 인덱싱을 먼저 나눈다.

| 특성 | 공유? | 검색 인덱스? | `og:type` | 해당 라우트 |
|------|-------|--------------|-----------|-------------|
| **A. 브랜드 홈** | 드묾. 기본 카드 | ✅ | `website` | `/` |
| **B. 캠페인 랜딩** | ✅ 주력 | ✅ | `website` | `/event1` |
| **C. 카탈로그 목록** | 가끔 | ✅ (공개 시) | `website` | `/shop`, `/community`, `/coaching` 목록 |
| **D. 상품 상세** | ✅ 주력 | ✅ (공개 시) | `website` + JSON-LD Product | `/shop/[id]` |
| **E. 아티클** | ✅ | ✅ 공개글만 | `article` | `/community/[slug]` |
| **F. 인증** | 링크 실수 대비 | ❌ | `website` | `/login`, `/signup/*` |
| **G. 회원 전용 앱** | ❌ | ❌ | 부모 fallback + `noindex` | `/learning/*`, `/coaching/*`, `/checkin/*`, `/mypage`, `/orders` |
| **H. 운영 포털** | ❌ | ❌ | `noindex` | `/admin/*`, `/coach/*` |

정책([screens/README.md](./screens/README.md)): 커뮤니티 읽기·Shop 목록/상세 보기는 비로그인 허용, 구매·내학습·코칭·체크인은 로그인. **OG는 공개로 열 페이지만 공들인다.**

---

## 6. 특성별 셋팅

### A. 브랜드 홈 `/`

개인화 피드(체크인·이어보기)를 OG에 넣지 않는다. 크롤러는 비로그인이다.

| 필드 | 값 |
|------|-----|
| `title.default` | `GLIA — {한 줄 포지션}` |
| `og:title` | `GLIA` |
| `og:description` | 사이트 공통 설명 |
| `og:url` | `/` |
| `og:image` | 기본 브랜드 컷 `/og/default.png` |
| `robots` | index, follow |

페이지에 `generateMetadata`를 두지 않고 **루트 metadata를 상속**해도 된다. 홈 전용 카피를 쓰려면 `(app)/(tabs)/page.tsx`에 static `metadata`를 둔다.

### B. 캠페인 랜딩 `/event1`

지금 `title` / `description`만 있다. OG를 같은 카피로 채우고, **전용 이미지**를 둔다.

```ts
export const metadata: Metadata = {
  title: { absolute: "GLIA 온라인 8주 — 1기 모집" },
  description: "몸의 신호를 읽고 스스로 조절하는 8주 온라인 프로그램. 정원 6명.",
  alternates: { canonical: "/event1" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "GLIA",
    title: "GLIA 온라인 8주 — 1기 모집",
    description: "몸의 신호를 읽고 스스로 조절하는 8주 온라인 프로그램. 정원 6명.",
    url: "/event1",
    images: [{ url: "/og/event1.png", width: 1200, height: 630, alt: "GLIA 온라인 8주 1기 모집" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "GLIA 온라인 8주 — 1기 모집",
    description: "몸의 신호를 읽고 스스로 조절하는 8주 온라인 프로그램. 정원 6명.",
    images: ["/og/event1.png"],
  },
};
```

기수·마감일이 바뀌면 설명 앞부분을 갱신한다. 이미지 파일을 바꾸면 카카오 캐시를 지운다 ([§12](#12-검증)).

### C. 카탈로그 목록 `/shop` · `/community`

목록은 개별 객체가 아니다. **컬렉션용 한 장** + 고정 카피.

| 경로 | title | description |
|------|-------|-------------|
| `/shop` | 프로그램 | 수강권·코칭·번들을 고르는 상점 |
| `/community` | 커뮤니티 | 회복 기록과 인증 글 |

`og:url`은 목록 canonical (`/shop`, `/community`). 페이지네이션이 생기면 `alternates.canonical`은 1페이지로 고정하고, 2페이지부터는 `robots: { index: false }` 또는 `pagination` 필드를 검토한다.

`/shop` · `/shop/[id]`는 로그인 없이 열린다 ([§8](#8-로그인-벽과-크롤러)).

### D. 상품 상세 `/shop/[id]`

공유 1순위. DB 값이 필요하므로 `generateMetadata`.

매핑:

| OG / meta | 소스 |
|-----------|------|
| `title` / `og:title` | `Product.title` |
| `description` / `og:description` | `Product.description` 첫 110자. 없으면 `{title} — GLIA 온라인 프로그램` |
| `og:url` | `/shop/{id}` |
| `og:image` | 히어로 1번 ([`getProductHeroImages`](../src/lib/shop-product-hero.ts)) → 없으면 `/og/default.png` |
| `og:image:alt` | 히어로 `alt` 또는 상품명 |

```ts
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);
  if (!product) notFound();

  const title = product.title;
  const description = excerpt(product.description, 110) ?? `${title} — GLIA 온라인 프로그램`;
  const hero = getProductHeroImages(product)[0];
  const image = hero ?? { src: "/og/default.png", alt: title };
  const url = `/shop/${product.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: "GLIA",
      title,
      description,
      url,
      images: [{ url: image.src, width: 1200, height: 630, alt: image.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.src],
    },
  };
}
```

가격·재고는 OG에 넣지 않고 JSON-LD `Product`에 넣는다. 세일가가 바뀌어도 카카오 카드 캐시와 어긋나지 않는다.

히어로가 4:5 갤러리여도 OG는 **별도 1200×630 크롭**을 쓰는 편이 안전하다. 여의치 않으면 동적 `opengraph-image.tsx`에 상품명+커버를 합성한다.

비활성 상품(`isActive: false`)은 `notFound()` — 카드가 죽은 URL을 가리키지 않게.

### E. 아티클 `/community/[slug]`

`og:type: article`. 공개 게시만.

| 필드 | 소스 |
|------|------|
| `og:title` | `Post.title` |
| `og:description` | `Post.excerpt` (이미 리스트용으로 있음) |
| `og:url` | `/community/{slug}` |
| `article:publishedTime` | `Post.publishedAt` ISO 8601 |
| `article:modifiedTime` | `Post.editedAt` ?? `updatedAt` |
| `article:author` | 표시 닉네임 (`displayAuthorName`) |
| `article:section` | `"커뮤니티"` 또는 원본글/인증글 |
| `og:image` | 본문 첫 이미지. 없으면 브랜드 기본 | 인증 글(`parentPostId`)도 공개면 동일 패턴. DRAFT / 삭제 / 비공개는 `notFound()` 또는 `robots: { index: false, follow: false }` + 기본 카드.

```ts
openGraph: {
  type: "article",
  title: post.title,
  description: post.excerpt ?? post.title,
  url: `/community/${post.slug}`,
  publishedTime: post.publishedAt?.toISOString(),
  modifiedTime: (post.editedAt ?? post.updatedAt).toISOString(),
  authors: [authorName],
  images: images,
},
```

작성자 실명·이메일은 OG에 넣지 않는다.

### F. 인증 `/login` · `/signup/*`

링크가 새 탭으로 새면 카드가 로그인 화면이 된다. **짧은 안내 + noindex.**

```ts
export const metadata: Metadata = {
  title: "로그인",
  description: "GLIA 계정으로 로그인합니다.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "GLIA 로그인",
    description: "GLIA 계정으로 로그인합니다.",
    url: "/login",
    images: defaultOgImages,
  },
};
```

`/login?next=/shop/xxx` 처럼 query가 있어도 `og:url`은 `/login`.

### G. 회원 전용 앱

`/learning/*`, `/coaching/[entitlementId]`, `/checkin/*`, `/mypage`, `/orders`.

타인에게 공유되면 안 되는 진도·주문·건강 기록이다.

`(app)` 아래 **스택 layout 또는 각 구간 layout**에:

```ts
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```

`openGraph`를 비우면 부모(브랜드) 카드가 나온다. 학습 레슨 제목이 카카오에 뜨는 것보다 낫다. 실수로 공유돼도 **개인 콘텐츠가 카드에 실리지 않게** 하는 것이 목표다.

레슨·코칭 세션에 `generateMetadata`로 실제 제목을 넣고 싶다면 반드시 `robots.noindex`를 같이 두고, 이미지는 기본 브랜드만 쓴다. 본문 캡처 금지.

### H. `/admin` · `/coach`

구간 layout에서 `robots: { index: false, follow: false }`. 검색·공유 대상이 아니다. OG 커스텀 불필요.

---

## 7. OG 이미지

### 7.1 한 장으로 맞출 스펙

| 항목 | 값 |
|------|-----|
| 제작 캔버스 | **1200 × 630** (1.91:1) |
| 카카오 실제 크롭 | 내부 800 × 400 (**2:1**). 스마트 크롭 |
| 안전 영역 | 좌우 80px · 상하 60px 안에 로고·제목을 넣지 말 것. 카카오가 상하를 조금 더 자름 |
| 형식 | JPEG 또는 PNG. WebP는 스크래퍼마다 거절 |
| 용량 | ≤ 1MB 권장, 하드 8MB / X 5MB |
| URL | HTTPS 절대 경로. 로그인·만료 서명 URL 금지 |
| 최소 | 한 변이 200px 미만이면 카카오가 미리보기 거부 |

커버가 세로면 그대로 넣지 말고 **1200×630 크롭본**을 따로 두거나 `opengraph-image.tsx`로 합성한다.

### 7.2 에셋 위치 (제안)

```
public/og/default.png      # 브랜드 기본
public/og/event1.png       # 캠페인
public/og/shop.png         # 상점 목록
public/og/community.png    # 커뮤니티 목록
```

상품 커버는 R2 공개 URL 또는 `opengraph-image.tsx`. 프록시 미디어(`proxied-media-url`)가 쿠키를 요구하면 OG에 쓰지 않는다.

### 7.3 동적 이미지 (`next/og`)

상품·글마다 제목이 다른 카드가 필요할 때.

```ts
// src/app/(app)/(stack)/shop/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "GLIA 프로그램";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getPublicProduct(id);
  const title = product?.title ?? "GLIA";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "72px 80px",
          background: "#1E839E",
          color: "white",
          fontSize: 56,
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.8 }}>GLIA</div>
        <div style={{ fontWeight: 700 }}>{title}</div>
      </div>
    ),
    { ...size },
  );
}
```

Satori 제약: `display: flex` 또는 `none`만, 웹 폰트는 파일로 로드, Pretendard는 `readFile`로 넣는다. 모듈 스코프에서 읽는 로컬 에셋은 요청과 무관하면 한 번만 읽는다.

파일 컨벤션을 쓰면 Metadata에 `images`를 중복 적지 않아도 된다.

---

## 8. 로그인 벽과 크롤러

크롤러는 세션 쿠키가 없다. 미들웨어가 302로 `/login?next=…` 보내면 **로그인 페이지 OG가 상품/글 카드가 된다.**

[`src/middleware.ts`](../src/middleware.ts) 기준:

| 경로 | 보호 | 스크래퍼가 보는 것 |
|------|------|-------------------|
| `/`, `/event1`, `/community`, `/login` | 비보호 | 해당 페이지 HTML ✅ |
| `/shop`, `/shop/[id]` | 비보호 (조회 공개, 신청은 로그인) | 상품 HTML ✅ |
| `/learning/*`, `/mypage`, `/orders`, … | 보호 | `/login` — 의도된 동작 |

회원 전용 URL이 공유되면 로그인 카드가 나오는 것이 맞다. G 구간은 noindex면 충분하다.

---

## 9. 라우트별 체크리스트

구현 시 이 표만 채워도 빠지지 않는다.

| URL | API | type | image | robots | 비고 |
|-----|-----|------|-------|--------|------|
| `/` | 루트 metadata | website | default | index | 개인화 데이터 금지 |
| `/event1` | static metadata | website | event1 전용 | index | 지금 title만 있음 |
| `/shop` | static | website | shop 목록 | index | 조회 공개 |
| `/shop/[id]` | `generateMetadata` | website | 히어로 또는 동적 OG | index | JSON-LD Product · 조회 공개 |
| `/community` | static | website | community | index | |
| `/community/[slug]` | `generateMetadata` | article | 본문 첫 이미지 / default | 공개만 index | publishedTime |
| `/community/new` | static | — | — | **noindex** | 작성 폼 |
| `/login`, `/signup/*` | `(auth)/layout` | website | default | **noindex** | |
| `/learning`, `/learning/[id]`, 레슨 | layout | 상속 | default만 | **noindex** | |
| `/coaching/*` | layout | 상속 | default만 | **noindex** | 목록을 마케팅으로 쓸 때만 예외 검토 |
| `/checkin/*` | layout | 상속 | — | **noindex** | 건강 데이터 |
| `/mypage`, `/orders` | layout | 상속 | — | **noindex** | |
| `/admin/*`, `/coach/*` | 각 layout | — | — | **noindex** | |

`/coaching` 탭이 “상품 진열”이 아니라 **내 코칭 허브**이면 G로 둔다. 공개 코칭 카탈로그는 `/shop`이다.

---

## 10. JSON-LD (검색용, OG와 역할 분리)

OG는 미리보기, JSON-LD는 검색 리치 결과. Next.js Metadata API는 JSON-LD를 생성하지 않는다. 페이지 서버 컴포넌트에 스크립트를 넣는다.

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
/>
```

| 페이지 | `@type` | 핵심 필드 |
|--------|---------|-----------|
| 루트 | `Organization` + `WebSite` | `name`, `url`, `logo` |
| `/shop/[id]` | `Product` | `name`, `description`, `image`, `offers.price`, `offers.priceCurrency` (`KRW`), `offers.availability` |
| `/community/[slug]` | `Article` | `headline`, `datePublished`, `author`, `image` |
| `/event1` | `Event` (선택) | `name`, `startDate`, `eventAttendanceMode` Online, `organizer` |

가격은 JSON-LD에만. OG description에 금액을 박으면 할인 변경 후 카드가 오래 틀린다.

---

## 11. 구현 순서 (오픈 전)

1. **`src/lib/site-metadata.ts`** — `SITE_URL`, `SITE_NAME`, `defaultOgImages`, excerpt 헬퍼. origin은 `APP_URL` (없으면 `https://online.glia.kr`).
2. **루트 `layout.tsx`** — `metadataBase`, title template, 기본 OG/Twitter. 지금 `"온라인 학습"` placeholder를 교체.
3. **`public/og/default.png`** — 1200×630. GLIA Blue(`#1E839E`) 톤, 로고+한 줄. 안전 영역 준수.
4. **`(auth)/layout`**, **`admin/layout`**, **`coach/layout`**, 회원 스택 layout — `robots.noindex`.
5. ~~Shop 미들웨어를 정책과 맞추기~~ — `/shop`, `/shop/[id]` 조회 공개. 신청 CTA만 로그인.
6. **`/event1`** — 전용 OG 이미지 + openGraph 블록. 오픈 전 공유 링크 1순위.
7. **`/shop/[id]`** — `generateMetadata` + (선택) `opengraph-image.tsx` + JSON-LD Product.
8. **`/community/[slug]`** — article 메타. excerpt·publishedAt 사용.
9. 목록 페이지 static OG.
10. [§12](#12-검증) 도구로 프로덕션 URL을 한 번씩 긁기.

헬퍼를 페이지마다 복사하지 말고 `buildPageMetadata({ type, title, description, path, images, article })` 한 곳으로 모은다. `openGraph` shallow merge를 잊기 쉽다.

---

## 12. 검증

배포 URL이 아니면 카카오/Meta는 localhost를 못 긁는다. 프리뷰 도메인 또는 프로덕션으로 확인.

| 도구 | URL | 보는 것 |
|------|-----|---------|
| 카카오 OG 캐시 초기화 | [developers.kakao.com/tool/clear/og](https://developers.kakao.com/tool/clear/og) | 톡 미리보기. 이미지 교체 후 **필수** |
| Sharing Debugger (Meta) | [developers.facebook.com/tools/debug](https://developers.facebook.com/tools/debug/) | OG 파싱, 재스크랩 |
| X Card | [cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) | `summary_large_image` |
| LinkedIn Inspector | [linkedin.com/post-inspector](https://www.linkedin.com/post-inspector/) | B2B 공유 시 |
| 로컬 HTML | `curl -sA "facebookexternalhit/1.1" https://…` | `<meta property="og:` 가 첫 HTML에 있는지 |

체크:

- [ ] `og:image`가 `https://` 로 시작
- [ ] 이미지 200×200 이상, 실제 1200×630
- [ ] `og:url` = canonical, http/www 혼용 없음
- [ ] 카카오에서 제목·이미지 잘림이 수용 가능한지
- [ ] 상품 URL을 시크릿 창에서 열면 로그인으로 안 튀는지 (공개 페이지)
- [ ] 비공개 URL은 `noindex`
- [ ] 이미지 교체 후 카카오 캐시 클리어

UA를 속여 로컬에서 스트리밍 메타를 보면, 일반 브라우저와 달리 **첫 바이트에 메타가 있어야** 한다. Next 기본 `htmlLimitedBots`가 이 차이를 처리한다.

---

## 13. 이 레포 현황 (2026-08-23)

| 위치 | 상태 |
|------|------|
| `src/lib/site-metadata.ts` | `metadataBase` · `buildPageMetadata` · 구간별 OG 이미지 |
| `src/app/layout.tsx` | 루트 title template · 기본 OG/Twitter · Organization/WebSite JSON-LD |
| `src/app/icon.png` · `favicon.ico` · `apple-icon.png` | 파일 컨벤션 파비콘 |
| `public/og/*.png` | default / event1 / shop / community · 1200×630 |
| `/event1` · `/shop` · `/shop/[id]` · `/community` · `/community/[slug]` | 특성별 OG. 상품·글은 JSON-LD |
| 인증 · 회원 전용 · admin/coach | `robots: noindex` |
| 미들웨어 | `/shop`, `/shop/[id]` 조회 공개. 신청은 로그인 |

---

## 14. 참고

- [ogp.me](https://ogp.me/) — 필수 4필드, 타입, 이미지 구조화 속성
- [Next.js generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) — 필드, 병합, streaming, Cache Components
- [Next.js opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) — 파일/코드 생성, v16 `params` Promise
- [카카오 메시지 템플릿 — OG 매핑](https://developers.kakao.com/docs/ko/message-template/common)
- [X Card markup](https://developer.x.com/en/docs/twitter-for-websites/cards/overview/markup)
- 화면 URL SSOT: [screens/README.md](./screens/README.md)
- 공개/보호 정책: [policies.md](./policies.md) §1.2 · screens README 「비로그인 기본」
