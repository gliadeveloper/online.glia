# /checkin — 체크인 허브

> **상태:** implemented

## 개요

| 항목 | 내용 |
|------|------|
| **URL** | `/checkin` · `?tab=daily|weekly` |
| **Tab/Stack** | Stack |
| **목적** | 데일리·주간 체크인 discover & 이력 |
| **진입** | 홈 hero CTA, 하단 링크 |

---

## 구성

- **탭:** 데일리 | 주간
- **데일리:** day strip → 날짜별 작성/조회
- **주간:** week strip → 주간 폼
- **이력** → `/checkin/history` (해당 시)

---

## 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect login |
| 미래 날짜 | empty / future state |
| 오늘 | 작성 or 수정 |

---

## 연결

| 액션 | 대상 |
|------|------|
| 오늘 작성 | `/checkin/daily/[date]` |
| 주간 | `/checkin/weekly/[date]` |
| 리포트 | `/checkin/daily/[date]/report` |
| 코치 접근 관리 | `/checkin/sharing` |

---

## 구현 참고

- `src/app/(app)/(stack)/checkin/page.tsx`
- `src/components/checkin/*`

---

## 코칭 연동

- 사용자가 코치 사용자 ID를 검색해 체크인 기록의 전체 접근 권한을 허용·차단한다.
