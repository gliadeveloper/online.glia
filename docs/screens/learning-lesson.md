# /learning/[slug]/lessons/[lessonId] — 레sson

> **상태:** implemented (타입별 분기)

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/learning/[slug]/lessons/[lessonId]` |
| **Tab/Stack** | Stack |
| **목적** | 콘텐츠 소비·완료 처리 |
| **정책 SSOT** | [policies.md](../policies.md) §8 (LIVE) |

---

## 레sson 타입별 UI

| type | UI |
|------|-----|
| **VIDEO** | R2 플레이어 + 완료 버튼 |
| **LIVE** | SCHEDULED: 카운트다운 / LIVE: LiveKit room / ENDED: 종료 안내 (VOD 변환 후 → VIDEO) |
| **TEXT** | Markdown 본문 |
| **QUIZ** | Quiz player |
| **ASSIGNMENT** | 제출 폼 |

공통: 이전/다음 레sson navigation (해당 시)

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| enrollment 없음 / 만료 | gate — 만료 안내 or 404 |
| LIVE + coach 미시작 | 카운트다운, 입장 불가 |
| LIVE + 진행 중 | 입장 버튼 → room |

---

## 연결

| 액션 | 대상 |
|------|------|
| 완료 | progress API → 코스 상세 refresh |
| LIVE token | `/api/learning/lessons/[id]/live-token` (LIVE only) |

---

## 구현 참고

- `src/app/(app)/(stack)/learning/[slug]/lessons/[lessonId]/page.tsx`
- `lesson-live-panel.tsx`, `lesson-video-player.tsx`, `quiz-player.tsx`
