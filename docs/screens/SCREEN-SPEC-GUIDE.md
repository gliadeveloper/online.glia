# Screen Spec 작성 가이드

> 모든 `docs/screens/*.md`는 **아래 섹션 순서·표 형식**을 따른다.  
> 복사 시작점: [_template.md](./_template.md)

---

## 1. 문서 한 장 = 화면 한 URL

| 규칙 | 설명 |
|------|------|
| 파일명 | kebab-case, URL 기준 — `community-post.md` ← `/community/[slug]` |
| 제목 | `# {URL} — {한글 화면명}` |
| 범위 | User `(app)` 기본. Coach/Admin은 `docs/screens/coach/` 등 하위 폴더 (필요 시) |
| 상태 | `draft` → `review` → `implemented` |

---

## 2. 고정 섹션 (순서 변경 금지)

| # | 섹션 | 무엇을 적나 |
|---|------|------------|
| **0** | 한 줄 요약 | 이 화면이 사용자에게 해주는 일 (1~2문장) |
| **1** | 라우팅 & Chrome | URL, Tab/Stack, chrome, 진입, 정책 링크 |
| **2** | 사용자 목표 | 들어와서 **무엇을 달성**하고 나가는가 |
| **3** | 화면 구조 | UI Block들 (아래 형식) |
| **4** | 상태 매트릭스 | 로그인·구매·역할 등에 따른 **화면 차이** |
| **5** | 연결 & 플로우 | 탭/버튼 → URL, API, 관련 flow md |
| **6** | Empty / Error | 0건, 404, 권한, 네트워크 |
| **7** | 구현 & 추적 | page, components, lib, API |
| **8** | 미결 & v2 | 아직 결정 안 된 것, copy 변경 |

**섹션이 해당 없으면** `_(해당 없음)_` 한 줄 — **섹션 자체는 삭제하지 않음.**

---

## 3. UI Block — 화면 구조 작성법

복잡한 화면은 **Block** 단위로 쪼갠다. (예: POST 본문 / 인증 글 / 댓글)

```markdown
### Block: {블록 이름}

| | |
|-|-|
| **역할** | 이 영역이 하는 일 |
| **노출** | always / conditional — 조건 명시 |

| # | UI 요소 | 데이터·규칙 | v1 |
|---|---------|---------------|-----|
| 1 | 작성자 닉네임 | `displayAuthorName` | ✅ |
| 2 | 올린 시간 | [시간 규칙](./README.md#시간-표기) | ✅ |
| 3 | 대표 사진 | 없으면 생략 | ❌ |

**인터랙션**

| 트리거 | 결과 | 대상 |
|--------|------|------|
| 카드 탭 | 상세 이동 | `/community/[slug]` |
| FAB | 작성 | `/community/new` |
```

### Block 나누는 기준

- 스크롤上 **시각적으로 구분**되는 영역 (헤더 / 리스트 / composer)
- **상태가 다르게** 변하는 영역 (CTA 블록 vs 본문)
- **역할이 다른** 반복 unit (목록 카드 1건 = Block 「POST 카드」)

### 단순 화면 (Block 1개)

목록만 있거나 폼 하나면 Block 하나로 충분.

---

## 4. 상태 매트릭스 — 표준 열

**기본 3열** (대부분의 화면):

| 조건 | UI | 이동 |
|------|-----|------|
| 비로그인 | … | `/login?next=…` |

**Commerce / 수강** — 열 추가 OK:

| 조건 | UI | CTA | 이동 |
|------|-----|-----|------|

**작성 팁**

- 조건 = **사용자 상태** (로그인, entitlement, enrollment status)
- UI = **보이는 것 / disabled / 대체되는 블록**
- 이동 = **다음 URL** (없으면 `—`)

한 화면에 매트릭스가 여러 종류면 **소제목**으로 분리:

```markdown
## 4. 상태 매트릭스

### 4.1 접근 (로그인)

### 4.2 Shop CTA (ProductShopState)
```

---

## 5. v1 / 기획 / 구현 불일치 표기

| 표기 | 의미 |
|------|------|
| ✅ | v1 포함·구현됨 |
| ❌ | v1 제외 |
| △ | 부분 구현 |
| **기획** | 아직 코드 반영 전 |

Block 표의 **v1** 열 + **§8 미결**에 기획-only 항목을 모은다.

---

## 6. 빠른 작성 순서 (추천)

1. **§0~§2** — 5분: URL, 목표, 진입
2. **§3 Block** — bullet로 UI 나열 (디자이너 없어도 OK)
3. **§4** — 「로그인 vs 비로그인」「구매 전 vs 후」만 먼저
4. **§5~§6** — 연결·empty
5. **§7** — 구현 시 채움 (AI에게 맡겨도 됨)
6. **§8** — 애매한 것 모으기

---

## 7. AI에게 시킬 때

```
docs/screens/_template.md 형식으로 /foo 화면 명세 작성.
policies.md §5, navigation-chrome-policy 준수.
상태 매트릭스 §4 필수.
```

기존 화면 수정:

```
docs/screens/community-post.md §3 Block: 댓글에 신고 추가.
§4·§8만 갱신.
```

---

## 8. 예시 문서

| 복잡도 | 참고 |
|--------|------|
| 단순 | [shop-product.md](./shop-product.md) — Block 적음, 상태 매트릭스 중심 |
| 중간 | [learning-course.md](./learning-course.md) |
| 복잡 | [community-post.md](./community-post.md) — Block 3개 (리팩터 예정) |

---

## 9. 체크리스트 (PR 전)

- [ ] 섹션 0~8 순서·제목 일치
- [ ] §1 Chrome = Tab/Stack 맞음 ([navigation-chrome-policy](../navigation-chrome-policy.md))
- [ ] §4 비로그인 행 있음 (해당 시)
- [ ] §5 모든 CTA에 대상 URL
- [ ] README [인벤토리](./README.md) 한 줄 추가/수정
- [ ] policies.md와 모순 없음
