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
| **VIDEO** | YouTube iframe + 완료 버튼 |
| **LIVE** | Zoom 입장 링크 (URL 등록 시) |
| **TEXT** | BlockNote 본문 |
| **QUIZ** | Quiz player |
| **ASSIGNMENT** | 제출 폼 |

공통: 이전/다음 레sson navigation (해당 시)

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| enrollment 없음 / 만료 | gate — 만료 안내 or 404 |
| LIVE + Zoom 미등록 | 「Zoom 링크 미등록」 안내 |
| LIVE + Zoom URL | 「Zoom 입장하기」 외부 링크 |

---

## LIVE 다시보기 (운영)

라이브 종료 후 다시보기는 **LIVE 레슨 삭제 → VIDEO 레슨 신규 생성 → YouTube URL 등록**으로 처리합니다.

---

## 연결

| 액션 | 대상 |
|------|------|
| 완료 | progress API → 코스 상세 refresh |

---

## 구현 참고

- `src/app/(app)/(stack)/learning/[slug]/lessons/[lessonId]/page.tsx`
- `lesson-live-panel.tsx`, `lesson-video-player.tsx`, `quiz-player.tsx`
