# /checkin — 체크인 허브

> **상태:** implemented  
> **마지막 갱신:** 2026-08-20  
> **비주얼:** GLIA Design System (`--glia-*` tokens · Pretendard · 대기 히어로)

---

## 0. 한 줄 요약

데일리·주간 체크인의 발견과 이력. 오늘의 리듬을 확인하고 작성·조회·코치 공유로 이어진다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/checkin` |
| **Tab/Stack** | Stack |
| **Chrome** | Mobile BackNav / Desktop UnifiedHeader |
| **목적** | 데일리·주간 체크인 discover & 이력 |
| **진입** | 홈 hero CTA, 하단 링크 |
| **정책 SSOT** | [policies.md](../policies.md) · [navigation-chrome-policy.md](../navigation-chrome-policy.md) |

---

## 2. 화면 구조

1. **Hero** — 대기 그라데이션, 오늘 날짜, 회복/연속 헤드라인, 날짜별 체크 스트립
2. **이번 주 주간 체크** — 작성·완료·일요일 잠금
3. **코치 공유** — `/checkin/sharing`
4. **작성한 목록** — 최근 5건, 더보기 `/checkin/history`
5. **하단 CTA** — 오늘 미작성이면 데일리, 아니면 작성 가능한 주간

---

## 3. 상태 매트릭스

| 조건 | UI |
|------|-----|
| 비로그인 | redirect login |
| 미래 날짜 | empty / future state |
| 오늘 미작성 | 히어로 프롬프트 + 하단 CTA |
| 오늘 작성 | 연속일 헤드라인, CTA는 주간(작성 가능할 때만) |

---

## 4. 연결

| 액션 | 대상 |
|------|------|
| 오늘 작성 | `/checkin/daily/[date]` |
| 주간 | `/checkin/weekly/[date]` |
| 리포트 | `/checkin/daily/[date]/report` |
| 코치 접근 관리 | `/checkin/sharing` |

---

## 5. 구현 참고

- `src/app/(app)/(stack)/checkin/page.tsx`
- `src/components/checkin/check-in-hub-panel.tsx`
- `src/components/checkin/checkin.css`

---

## 코칭 연동

- 사용자가 코치 사용자 ID를 검색해 체크인 기록의 전체 접근 권한을 허용·차단한다.
