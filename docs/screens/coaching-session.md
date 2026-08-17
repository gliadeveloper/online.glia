# /coaching/sessions/[id] — 코칭 회차 상세

> **상태:** implemented  
> **마지막 갱신:** 2026-07-30

---

## 0. 한 줄 요약

코칭 회차 본문을 읽고, 강사 Q&A(댓글형 UI)로 질문한다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/coaching/sessions/[id]` |
| **Tab/Stack** | Stack |
| **진입** | `/coaching/[entitlementId]` 회차 카드, 홈 피드 |
| **뒤로** | 해당 entitlement 회차 목록 |

---

## 2. 사용자 목표

- 코치 피드백 본문 읽기
- Q&A로 질문·답변 확인

---

## 3. 화면 구조

### Block: 헤더

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | N회차 · 제목 | ✅ |
| 2 | 강사 프로필 사진 | ✅ |
| 3 | 강사 닉네임 | ✅ |
| 4 | 요약 (optional) | ✅ |

### Block: 내용

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | Markdown 본문 | ✅ |

### Block: Q&A

| | |
|-|-|
| **역할** | 학생↔코ach 메시지 — **댓글형 UI** |
| **노출** | PUBLISHED only |

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | 메시지 row (avatar, name, time, body) | ✅ |
| 2 | 답변 대기 표시 | ✅ |
| 3 | composer | ✅ |

---

## 4. 상태 매트릭스

| publicationStatus | UI |
|-------------------|-----|
| PUBLISHED | 본문 + Q&A |
| EMPTY / DRAFT | 404 (customer) |

---

## 5. 연결 & 플로우

| 액션 | 대상 |
|------|------|
| Q&A 전송 | `POST /api/coaching/sessions/[id]` |
| 뒤로 | `/coaching/[entitlementId]` |

---

## 7. 구현 & 추적

- `src/app/(app)/(stack)/coaching/sessions/[id]/page.tsx`
- `coaching-coach-profile.tsx`, `coaching-session-qna-panel.tsx`, `coaching-markdown.tsx`

---

## 8. 미결 & v2

- 체크인 접근 권한 연동 UI
