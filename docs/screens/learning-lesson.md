# /learning/[id]/lessons/[lessonId] — 레슨

> **상태:** implemented  
> **마지막 갱신:** 2026-09-28

## 0. 한 줄 요약

수강 중인 레슨을 보고 완료한 뒤, 같은 코스 수강생과 강사에게 공개되는 Q&A에 질문하고 답한다.

---

## 1. 라우팅 & Chrome

| 항목 | 내용 |
|------|------|
| **URL** | `/learning/[id]/lessons/[lessonId]` |
| **Tab/Stack** | Stack |
| **Chrome** | 레슨 플레이어. 커리큘럼·수업자료는 사이드(모바일은 하단 탭) |
| **진입** | `/learning/[id]` 커리큘럼, 홈 이어하기, 알림 |
| **정책 SSOT** | [policies.md](../policies.md) §5.4 · §5.6 · §8 |
| **용어** | 질문 = `Discussion` (`type = QUESTION`) · 답변 = `DiscussionReply` · 업보트 = `DiscussionVote` / `DiscussionReplyVote` |

---

## 2. 사용자 목표

- 레슨 콘텐츠를 보고 완료 처리
- 이 레슨에 질문을 올리고, 다른 수강생·강사의 답과 업보트를 확인
- 본인 글을 고치거나 지움

---

## 3. 화면 구조

### Block: 플레이어 · 본문

| | |
|-|-|
| **역할** | 레슨 타입별 콘텐츠 소비 |
| **노출** | 수강 접근 가능 시 |

| type | UI |
|------|-----|
| **VIDEO** | YouTube iframe + 완료 버튼 |
| **LIVE** | Zoom 입장 링크 (URL 등록 시) |
| **TEXT** | Markdown/BlockNote 본문 |
| **QUIZ** | Quiz player |
| **ASSIGNMENT** | 제출 폼 |

공통: 이전/다음 레슨, 수업자료 탭(`LessonMaterial`). 다시보기는 LIVE 삭제 후 VIDEO 신규 생성.

### Block: Q&A 작성

| | |
|-|-|
| **역할** | 이 레슨에 질문을 등록 |
| **노출** | 제목 아래 **Q&A** 탭. 기본 탭은 **강의**. `#qna-` 로 들어오면 Q&A 탭. 커리큘럼·수업자료 탭 아님 |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 제목 | 필수. 공백만이면 등록 불가. 120자 | ✅ |
| 2 | 설명 | 선택. 4000자. 영상 분·초는 여기에 직접 입력 | ✅ |
| 3 | 이미지 | 설명 안에 삽입. 최대 3장. 이미지 파일만 | ✅ |
| 4 | 등록 | 현재 레슨에 자동 연결 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 등록 | 질문 생성. 강사에게 알림 | `POST /api/learning/lessons/[lessonId]/questions` |
| 이미지 | 설명에 이미지 주소 삽입 | `POST /api/learning/lessons/[lessonId]/questions/media` |

### Block: Q&A 목록 · 스레드

| | |
|-|-|
| **역할** | 이 레슨 질문을 업보트 순으로 읽고 답함 |
| **노출** | Q&A 탭. 강의 탭에는 본문·퀴즈·과제 |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 질문 카드 | 제목, 작성자, 상대 시간, 업보트 수, 답변 수 | ✅ |
| 2 | 정렬 | 업보트 많은 순. 같으면 최신 | ✅ |
| 3 | 업보트 | 수강생·강사. 다시 누르면 취소. 질문·답변 각각 | ✅ |
| 4 | 답변 | 본문(설명과 동일 규칙). 닫힌 질문은 입력 숨김 | ✅ |
| 5 | 채택 답 | 강사 채택 1개. 업보트와 무관하게 스레드 맨 위 | ✅ |
| 6 | 본인 글 | 수정·삭제 | ✅ |
| 7 | 닫힘 | 강사가 닫으면 새 답변 없음 | ✅ |
| 8 | 강사 표시 | 코스 `instructorId`와 작성자가 같으면 강사 표기 | ✅ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 업보트 | 토글 | `POST .../questions/[questionId]/vote` · `.../replies/[replyId]/vote` |
| 답변 등록 | 질문 작성자에게 알림 | `POST .../questions/[questionId]/replies` |
| 수정 | 본인 글 | `PATCH` 질문 또는 답변 |
| 삭제 | 본인 글 | `DELETE` 질문 또는 답변 |
| 채택 | 강사만. 다시 누르면 해제 | `POST .../questions/[questionId]/accept` |
| 닫기 | 강사만 | `PATCH` 질문 `{ isClosed: true }` |

---

## 4. 상태 매트릭스

### 4.1 접근

| 조건 | UI | 이동 |
|------|-----|------|
| 비로그인 | 레슨으로 보냄 | `/login?next=/learning/[id]/lessons/[lessonId]` |
| 수강 없음 | 404 | — |
| 만료·중단 | 만료 안내. Q&A 없음 | Shop 연장/복구 |
| 유효 수강 (`ACTIVE`·`COMPLETED`) | 플레이어 + Q&A | — |
| 코스 강사 (수강 없이 코치 포털) | 레슨 플레이어 대신 받은편지함 | `/coach/questions` |

### 4.2 Q&A

| 조건 | UI | CTA | 이동 |
|------|-----|-----|------|
| 질문 0건 | 작성 칸 + 빈 안내 | 질문 등록 | — |
| 질문 닫힘 | 답변 입력 숨김 | — | — |
| 본인 글 | 수정·삭제 | — | — |
| 강사가 레슨에 수강 중 | 채택·닫기 추가 | — | — |
| 네트워크 실패 | 칸 안에 오류 문구 | 다시 시도 | — |

---

## 5. 연결 & 플로우

| 트리거 | 대상 |
|--------|------|
| 새 답변 알림 | 이 레슨 `#qna-[questionId]` |
| 강사 받은편지함 | [coach/lesson-questions.md](./coach/lesson-questions.md) |
| 완료 | progress API → 코스 상세 refresh |
| 수업자료 | `/api/learning/lessons/[lessonId]/materials/[materialId]` |

**관련 플로우:** [flows/purchase-to-learning.md](./flows/purchase-to-learning.md)

---

## 6. Empty / Error / Edge

| 케이스 | UI | CTA |
|--------|-----|-----|
| 질문 0건 | 「아직 질문이 없습니다. 막힌 지점을 남겨 주세요.」 | 작성 칸 |
| 404 레슨 | 404 | — |
| 수강 만료 | 만료 안내. Q&A 미노출 | Shop |
| 제목 없음 | 등록 버튼 비활성 | — |
| 이미지 4장째 | 「이미지는 3장까지 넣을 수 있습니다.」 | — |
| 네트워크 오류 | 폼 오류 문구 | 다시 시도 |

---

## 7. 구현 & 추적

| | |
|-|-|
| **Page** | `src/app/(app)/(stack)/learning/[id]/lessons/[lessonId]/page.tsx` |
| **Components** | `lesson-player-shell.tsx` · `lesson-qna-panel.tsx` |
| **Lib** | `src/lib/lesson-qna.ts` · `src/lib/home-notifications.ts` |
| **API** | `/api/learning/lessons/[lessonId]/questions` 및 vote · replies · accept · media |

---

## 8. 미결 & v2

| 항목 | 메모 |
|------|------|
| 검색 | 코스 질문 검색은 v2 |
| 질문 팔로우 | v2 |
| 영상 시점 칸 | v1은 설명에 직접 입력 |
| 동작 사진 전용 칸 | v1은 설명 안 이미지 |
| 답변 속도 배지 | v2 |
| 샵·비수강 공개 | 하지 않음 |
| 수강생용 코스 전체 Q&A | v2 |
| 신고 | v2 |
