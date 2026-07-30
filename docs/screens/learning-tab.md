# /learning — 내 학습 (Tab)

> **상태:** implemented  
> **마지막 갱신:** 2026-07-30

---

## 0. 한 줄 요약

수강 중·완료한 클래스를 구분해 보고, 코스 상세(커리큘럼)로 이어 학습한다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/learning` |
| **Tab/Stack** | Tab |
| **Chrome** | Mobile separated + bottom tab |
| **목적** | LMS 수강 허브 (코칭은 `/coaching`) |
| **정책 SSOT** | [policies.md](../policies.md) §5.4 |

---

## 2. 사용자 목표

- **이어보기:** ACTIVE 수강 코스 전체 확인 → 이어 학습
- **전체 목록:** COMPLETED 수강 완료 코스 열람

---

## 3. 화면 구조

### Block: 이어보기

| | |
|-|-|
| **역할** | 현재 수강 중 (`ACTIVE`) 클래스 **전부** |
| **노출** | always (0건이면 Empty) |

| # | UI 요소 | v1 |
|---|---------|-----|
| 1 | 썸네일 | ✅ |
| 2 | 코스명 | ✅ |
| 3 | 진도 N/M · % | ✅ |
| 4 | 수강 기간 pill | ✅ |

### Block: 전체 목록

| | |
|-|-|
| **역할** | `COMPLETED` 클래스 목록 |
| **노출** | always |

### Block: 만료된 클래스 (보조)

| | |
|-|-|
| **역할** | `EXPIRED` — 연장 CTA |
| **노출** | EXPIRED ≥ 1 |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 카드 | 코스 상세 | `/learning/[slug]` |

---

## 4. 상태 매트릭스

| 조건 | 이어보기 | 전체 목록 |
|------|----------|-----------|
| 비로그인 | Empty + 로그인 | — |
| ACTIVE 0 | Empty + Shop | — |
| COMPLETED 0 | — | Empty |

---

## 5. 연결 & 플로우

| 액션 | 대상 |
|------|------|
| 코스 카드 | `/learning/[slug]` |
| Shop CTA | `/shop` |

---

## 7. 구현 & 추적

- `src/app/(app)/(tabs)/learning/page.tsx`
- `enrollment-course-card.tsx`

---

## 8. 미결 & v2

- 최근 학습순 정렬
- 코칭 섹션은 `/coaching` 전용 (내학습 Tab에서 분리됨)
