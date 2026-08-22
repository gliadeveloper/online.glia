# Home IA — `/`

> **SSOT:** 홈 정보 구조. 화면 명세: [home.md](../home.md)

---

## 1. 역할

홈은 **회복 웰니스 랜딩**이다. 전체 목록은 각 탭·스택이 담당한다.

| 목적지 | 경로 |
|--------|------|
| 학습 목록 | `/learning` |
| 코칭 허브 | `/coaching` |
| 커뮤니티 | `/community` |
| 체크인 허브 | `/checkin` (Stack, 탭 아님) |
| 마이페이지 | `/mypage` (히어로 유틸) |
| Shop | `/shop` |

---

## 2. 계층

```
L0  워드마크 · 마이/로그인 (mobile on-hero)
L1  Hero — 인사 · 철학 · 체크인 CTA
L2  지금 확인할 소식 (로그인, 미열람 ≥ 1)
    이어가는 여정 (로그인)
    균형의 네 축
    프로그램 탐색
L3  Bottom tab / Desktop inline
    홈 · 커뮤니티 · 내학습 · 코칭
```

Hero의 primary CTA는 데일리 체크인 하나다. 주간 체크인은 `/checkin`에서 발견한다.
