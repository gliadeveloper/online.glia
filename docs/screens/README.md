# Screen Specs — User `(app)`

> **SSOT:** Customer-facing 화면 명세. 규칙은 [policies.md](../policies.md), chrome은 [navigation-chrome-policy.md](../navigation-chrome-policy.md).  
> **작성법:** **[SCREEN-SPEC-GUIDE.md](./SCREEN-SPEC-GUIDE.md)** · 복사: [_template.md](./_template.md)  
> **협업:** Notion/Issue에서 논의 → **결정안은 이 폴더 md로 반영** → PR.

---

## 화면 인벤토리

| URL | Tab/Stack | 문서 | 목적 |
|-----|-----------|------|------|
| `/` | Tab | [home.md](./home.md) · [IA](./flows/home-ia.md) | 회복 허브·체크인·여정·탐색 |
| `/community` | Tab | [community-list.md](./community-list.md) | POST 목록 |
| `/community/[slug]` | Stack | [community-post.md](./community-post.md) | POST 상세·인증 글·댓글 |
| `/community/new` | Stack | [community-new.md](./community-new.md) | 글/인증 글 작성 |
| `/learning` | Tab | [learning-tab.md](./learning-tab.md) | 수강·코칭 허브 |
| `/learning/[slug]` | Stack | [learning-course.md](./learning-course.md) | 코스 상세·커리큘럼 |
| `/learning/[slug]/lessons/[lessonId]` | Stack | [learning-lesson.md](./learning-lesson.md) | 레sson 플레이어 |
| `/coaching` | Tab | [coaching-list.md](./coaching-list.md) | 코칭 상품 목록 |
| `/coaching/[entitlementId]` | Stack | [coaching-list.md](./coaching-list.md#coachingentitlementid--회차-목록) | 회차 목록 |
| `/coaching/sessions/[id]` | Stack | [coaching-session.md](./coaching-session.md) | 회차 콘텐츠·Q&A |
| `/checkin` | Stack | [checkin-hub.md](./checkin-hub.md) | 데일리·주간 체크인 |
| `/shop` | Stack | [shop-list.md](./shop-list.md) | 상품 목록 |
| `/shop/[slug]` | Stack | [shop-product.md](./shop-product.md) | 상품 상세·구매 CTA |
| `/mypage` | Stack | [mypage.md](./mypage.md) | 계정·메뉴 |
| `/orders` | Stack | [orders.md](./orders.md) | 주문 내역 |

### 플로우

| 문서 | 내용 |
|------|------|
| [flows/home-ia.md](./flows/home-ia.md) | **홈 IA** — 계층·슬롯·nav graph |
| [flows/purchase-to-learning.md](./flows/purchase-to-learning.md) | Shop → 결제 → 내학습 → 레sson |
| [flows/community-challenge.md](./flows/community-challenge.md) | 원본 글 → 인증 글 |

---

## 공통 규칙

### 시간 표기 (커뮤니티·피드)

| 경과 | 표기 |
|------|------|
| &lt; 1분 | 방금 전 |
| &lt; 1시간 | N분 전 |
| &lt; 24시간 | N시간 전 |
| &lt; 7일 | N일 전 |
| ≥ 7일 | 절대 날짜 (예: 7월 12일) |

구현: `formatPostRelativeTime` · `src/lib/post-content.ts`

### 작성자 표시

- **닉네임:** `User.name` → 없으면 email `@` 앞부분 (`displayAuthorName`)
- **프로필 사진:** `Profile.avatarUrl` · 없으면 이니셜

### 비로그인 기본

| 액션 | 비로그인 |
|------|----------|
| Tab 목록·글 읽기 | ✅ |
| 좋아요·댓글·작성 | `/login?next=…` |
| 내학습·코칭·구매 | redirect login |
| Shop 목록·상세 보기 | ✅ (구매 시 login) |

---

## 새 화면 추가 절차

1. **[SCREEN-SPEC-GUIDE.md](./SCREEN-SPEC-GUIDE.md)** 훑기 (섹션 0~8 고정)
2. [_template.md](./_template.md) 복사 → `docs/screens/{name}.md`
3. §3 **UI Block**에 요소 나열 (§4 상태 매트릭스 필수)
4. 이 README [인벤토리](#화면-인벤토리)에 한 줄 추가
5. [policies.md](../policies.md) §13 체크리스트
6. PR

---

## AI / 구현 요청 예시

```
docs/screens/community-list.md + policies.md §4 기준으로 App Tone v1 UI.
상태 표와 불일치 있으면 문서 수정 제안.
```
