# /community/new — 글 작성

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/community/new` · `?parent={slug}` (하위 글) |
| **Tab/Stack** | Stack |
| **목적** | root POST 또는 parent 아래 child POST 작성 |
| **진입** | FAB, 하위글 작성 버튼 |

---

## 구성

- Markdown composer (제목 + 본문)
- parent 쿼리 있으면: 부모 글 context 표시
- 제출 → `/community/[new-slug]`

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect `/login?next=…` |
| 로그인 | 작성 폼 |

---

## 구현 참고

- `src/app/(app)/(stack)/community/new/page.tsx`
- `src/components/community/create-post-form.tsx`
