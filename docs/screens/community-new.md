# /community/new — 글 작성

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/community/new` · `?parent={slug}` (인증 글) |
| **Tab/Stack** | Stack |
| **목적** | root POST 또는 parent 아래 child POST 작성 |
| **진입** | FAB, 인증 글 작성 버튼 |
| **용어** | UI 「인증 글」 = 데이터 `childPost`, UI 「원본 글」 = `parentPost` |

---

## 구성

- Markdown composer (제목 + 본문)
- parent 쿼리 있으면: 원본 글 context 표시
- 제출 → `/community/[new-slug]`

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect `/login?next=…` |
| 로그인 | 작성 폼 |

---

## 구현 참고

- `src/app/(app)/community/(stack)/new/page.tsx`
- `src/components/community/create-post-form.tsx`
- 글 수정(`/community/[slug]/edit`)도 같은 디자인/폼 구조 사용

---

## 디자인

| | |
|-|-|
| **Design** | GLIA Recovery Wellness — scope root `.glia-write`, `src/components/community/community-write-glia.css`, 토큰 `src/app/design-tokens/glia.css` |
| **Mode** | Focused form(작성) — 카드 금지. 단일 컬럼(모바일 100% / 태블릿+ 45rem) + 라벨·입력·hairline divider로 위계. 카드는 `/community` 피드(Discovery)에서만 |
