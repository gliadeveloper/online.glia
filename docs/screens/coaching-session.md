# /coaching/sessions/[id] — 코칭 회차 상세

> **상태:** implemented  
> **비주얼:** GLIA Design System (`--glia-*` · Pretendard · Editorial 읽기)  
> **마지막 갱신:** 2026-09-14

---

## 0. 한 줄 요약

코칭 회차 본문을 읽고, 과제 후 한줄 기록을 남기며, 강사 Q&A로 질문한다.

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
- 과제 후 한줄 기록 (답변 없음)
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
| 1 | BlockNote 본문 (이미지·영상) | ✅ |

### Block: 응답 스위치

| | |
|-|-|
| **역할** | 한줄 기록과 Q&A를 **같은 자리**에서 전환. 기록이 쌓여도 Q&A가 밀리지 않음 |
| **노출** | PUBLISHED only |
| **기본** | 한줄 기록. 코치 댓글 알림은 `?panel=qna` |

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | 한줄 기록 / Q&A 탭 (건수) | ✅ |
| 2 | Q&A 답변 대기 뱃지 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 탭 | 해당 패널만 표시 | `?panel=log` · `?panel=qna` |

### Block: 한줄 기록

| | |
|-|-|
| **역할** | 회원이 과제 수행 후 남기는 개인 기록. N개. **코치 답변 없음** |
| **노출** | PUBLISHED only |

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | 안내 카피 (답변 없음) | ✅ |
| 2 | 한 줄 composer (120자) | ✅ |
| 3 | 기록 타임라인 (최신순, 기본 5개 · 더 보기) | ✅ |
| 4 | 본인 기록 삭제 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 남기기 | 기록 추가 | `POST /api/coaching/sessions/[id]/logs` |
| 삭제 | 본인 기록 제거 | `DELETE /api/coaching/sessions/[id]/logs/[logId]` |

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
| PUBLISHED | 본문 + 한줄 기록/Q&A 스위치 |
| EMPTY / DRAFT | 404 (customer) |

---

## 5. 연결 & 플로우

| 액션 | 대상 |
|------|------|
| 한줄 기록 | `POST /api/coaching/sessions/[id]/logs` |
| 한줄 기록 삭제 | `DELETE /api/coaching/sessions/[id]/logs/[logId]` |
| Q&A 전송 | `POST /api/coaching/sessions/[id]` |
| 패널 | `?panel=log` · `?panel=qna` |
| 뒤로 | `/coaching/[entitlementId]` |

---

## 7. 구현 & 추적

- `src/app/(app)/(stack)/coaching/sessions/[id]/page.tsx`
- `coaching-coach-profile.tsx`, `coaching-session-response.tsx`, `coaching-session-log-panel.tsx`, `coaching-session-qna-panel.tsx`, `coaching-markdown.tsx`
- Design: GLIA Recovery Wellness — scope root `.glia-session` (Editorial), `src/components/coaching/coaching-stack-glia.css`
- Mode: Editorial(읽기) — 본문·한줄 기록·Q&A는 카드 금지. 680–720px 리딩 컬럼 + hairline. 기록과 Q&A는 세로 스택이 아니라 스위치. 카드는 회차 목록(Discovery)에서만

---

## 8. 미결 & v2

- 체크인 접근 권한 연동 UI
