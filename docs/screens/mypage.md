# /mypage — 마이페이지

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/mypage` |
| **Tab/Stack** | Stack |
| **목적** | 프로필·설정·전역 메뉴 |
| **진입** | 헤더 auth, Home hero utility |

---

## 구성

- 프로필 요약 (name, email, headline, avatar)
- 메뉴: 프로필 수정, 주문 내역, 로그아웃
- → `/mypage/edit`, `/orders`

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect login |

---

## 커뮤니티 연동

- **닉네임** = `User.name` (수정 → `/mypage/edit`)
- **프로필 사진** = `Profile.avatarUrl` (R2 업로드 · 바꾸기 · 삭제, URL 입력 없음)

---

## 구현 참고

- `src/app/(app)/(stack)/mypage/page.tsx`
- `mypage-profile-summary.tsx`, `mypage-menu.tsx`
