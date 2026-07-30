# /community/[slug] — POST 상세

> **상태:** review  
> **마지막 갱신:** 2026-07-30

---

## 0. 한 줄 요약

커뮤니티 글을 읽고, 챌린지 하위글(인증)을 남기며, 댓글로 대화한다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/community/[slug]` |
| **Tab/Stack** | Stack |
| **Chrome** | Mobile: ← + 제목 / Desktop: unified header |
| **진입** | `/community` 카드, 알림(v2) |
| **정책 SSOT** | [policies.md](../policies.md) §10 |
| **용어** | 기획 「챌린지 인증글」= **하위 글 (childPost)** |

---

## 2. 사용자 목표

- 본문 전체 읽기
- (부모글) 인증 하위글 작성·열람
- 댓글·답글·좋아요

---

## 3. 화면 구조

### Block: POST 본문

| | |
|-|-|
| **역할** | 메인 콘텐츠 + engagement |
| **노출** | always |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 작성자 프로필 | placeholder | △ |
| 2 | 작성자 닉네임 | `displayAuthorName` | ✅ |
| 3 | 올린 시간 | [시간 규칙](./README.md) | ✅ |
| 4 | 제목 | h1 | ✅ |
| 5 | 본문 | Markdown | ✅ |
| 6 | 좋아요 | 토글 + count | ✅ |
| 7 | 댓글 수 | → `#post-comments` | ✅ |
| 8 | 조회수 | 진입 increment | ✅ |
| 9 | 부모 글 링크 | child post일 때만 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 좋아요 | toggle | `POST …/likes` |

---

### Block: 하위 글 (챌린지 인증)

| | |
|-|-|
| **역할** | parent 아래 child post 목록 + 작성 |
| **노출** | parent post only |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 목록 | childPosts | ✅ |
| 2 | 미리보기 | title, excerpt, author, time | ✅ |
| 3 | 노출 개수 | **기획: max 7 + 더보기** | △ 전체 |
| 4 | 작성 CTA | 「하위 글 작성」 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 카드 | 상세 | `/community/[child-slug]` |
| 작성 | new | `/community/new?parent={slug}` |

---

### Block: 댓글

| | |
|-|-|
| **역할** | 스레드 + composer |
| **노출** | always |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 댓글 row | author, time, body, like | ✅ |
| 2 | 답글 | 1 depth (`parentId`) | ✅ |
| 3 | 수정·삭제 | **본인만** | ✅ |
| 4 | composer | 로그인 필수 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 답글 | inline reply | API |
| 비로그인 composer | 숨김 + login | `/login?next=…` |

---

## 4. 상태 매트릭스

### 4.1 접근 · 로그인

| 조건 | UI | 이동 |
|------|-----|------|
| 비로그인 | 읽기 OK; like/comment/하위글 → login | `/login?next=…` |
| 로그인 | 전 기능 | — |
| slug 없음 | 404 | — |
| DRAFT | 미노출 | — |

---

## 5. 연결 & 플로우

| 트리거 | 대상 |
|--------|------|
| 하위글 작성 | `/community/new?parent={slug}` |
| 하위글 카드 | `/community/[child-slug]` |
| 좋아요 | `POST /api/posts/[slug]/likes` |

**관련 플로우:** [community-challenge.md](./flows/community-challenge.md)

---

## 6. Empty / Error / Edge

| 케이스 | UI | CTA |
|--------|-----|-----|
| 댓글 0건 | 안내 copy | composer |
| 404 | notFound | — |

---

## 7. 구현 & 추적

| | |
|-|-|
| **Page** | `src/app/(app)/(stack)/community/[slug]/page.tsx` |
| **Components** | `post-child-list`, `post-comment-list`, `post-comment-composer` |
| **Lib** | `src/lib/posts.ts` |
| **API** | `/api/posts/[slug]/comments`, `…/likes` |

---

## 8. 미결 & v2

| 항목 | 메모 |
|------|------|
| 하위글 7개 cap | + 더보기 페이지 |
| 프로필 사진 | avatar |
| 타인 프로필 | v2 |
| 신고 | v2 |
