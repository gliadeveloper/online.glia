# /community — 커뮤니티 목록

> **상태:** review (썸네일·프로필 사진 v2)

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/community` |
| **Tab/Stack** | Tab |
| **Chrome** | Mobile separated header + bottom tab |
| **목적** | POST 피드 탐색 |
| **진입** | 하단 탭 「커뮤니티」, 홈 링크 |
| **정책 SSOT** | [policies.md](../policies.md) §10 Community |

---

## POST 카드 (목록 1건)

| # | 요소 | v1 | 비고 |
|---|------|-----|------|
| 1 | 작성자 프로필 | 이니셜 placeholder | v2: avatar |
| 2 | 작성자 닉네임 | ✅ `displayAuthorName` | |
| 3 | 올린 시간 | ✅ 상대/절대 ([README](./README.md)) | |
| 4 | POST 제목 | ✅ | |
| 5 | POST 미리보기 | ✅ `excerpt` (line-clamp 3) | |
| 6 | 대표 사진 | ❌ v1 | v2: cover 또는 본문 첫 이미지 |
| 7 | 좋아요 수 | ✅ | |
| 8 | 댓글 수 | ✅ | |
| 9 | 조회수 | ✅ | |
| — | 하위글 수 | ✅ (childPostCount > 0) | 챌린지 인증글 |

### 글로벌 액션

- **글 작성 FAB** → `/community/new` (비로그인 → login)

### 정렬

- v1: **최신순** (`publishedAt` desc, root posts only)

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| POST 0건 | Empty + 작성 유도 |
| 비로그인 | 목록 OK, FAB → login |
| 로그인 | FAB → new |

---

## 연결

| 액션 | 대상 |
|------|------|
| 카드 탭 | `/community/[slug]` |
| FAB | `/community/new` |

---

## 구현 참고

- `src/app/(app)/(tabs)/community/page.tsx`
- `src/components/community/community-post-card.tsx`
- `src/components/community/community-write-fab.tsx`

## 미결 / v2

- 목록 썸네일 정책
- 프로필 아바타
- 인기순 정렬
