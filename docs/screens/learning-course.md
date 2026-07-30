# /learning/[slug] — 코스 상세

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/learning/[slug]` |
| **Tab/Stack** | Stack |
| **목적** | 커리큘럼·진도·레sson 진입 |
| **진입** | 내학습 카드, Shop 구매 후 |

---

## 구성

1. **코스 헤더** — 제목, 설명, 전체 진도 %, 수료 여부
2. **커리큘럼 리스트**
   - 모듈 → 레sson
   - 레sson 타입 (VIDEO / LIVE / TEXT / QUIZ …)
   - 완료/진행 상태 pill
3. **다음 레sson CTA** (선택)

---

## 상태 매트릭스

| accessState | UI |
|-------------|-----|
| `active` | 헤더 + 커리큘럼 → 레sson 링크 |
| `expired` | **EnrollmentExpiredNotice** only — extend / restore → Shop |
| `blocked` | 404 |
| 비로그인 | redirect login |

| Enrollment status | 레sson 접근 (기간 OK) |
|-------------------|----------------------|
| ACTIVE | ✅ |
| COMPLETED | ✅ 복습 |
| EXPIRED | ❌ → 만료 UI |

---

## 연결

| 액션 | 대상 |
|------|------|
| 레sson row | `/learning/[slug]/lessons/[lessonId]` |
| 연장 | `/shop/[extension-slug]` |
| 복구 | `/shop/[bundle-lifetime-slug]` |

---

## 구현 참고

- `src/app/(app)/(stack)/learning/[slug]/page.tsx`
- `course-detail-header.tsx`, `course-module-list.tsx`
- `enrollment-expired-notice.tsx`
