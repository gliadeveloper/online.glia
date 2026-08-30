# 프로젝트 정책 (Policy Hub)

> **한 페이지에서 전체 정책의 SSOT(진입점)을 찾는 문서.**  
> 상세 스펙·토큰·구현 맵은 하위 문서를 따른다.  
> **최종 갱신:** 2026-07

---

## 이 문서 쓰는 법

| 상황 | 먼저 볼 섹션 |
|------|----------------|
| customer UI / 바텀탭 화면 추가 | [§4 Customer App](#4-customer-app-app) → [screens/README.md](./screens/README.md) |
| 특정 URL 구현·수정 | [docs/screens/](./screens/) 해당 md |
| 색·타이포·컴포넌트 토큰 | [§4.2 Corporate Trust](#42-corporate-trust) · [§4.2a Auth GLIA](#42a-auth--glia-recovery-wellness) · [visual-direction.md](./visual-direction.md) |
| Shop / 수강권 / 만료 / 연장 | [§5 Commerce & LMS Access](#5-commerce--lms-access) |
| 코치 포털 기능 추가 | [§7 Coach Portal](#7-coach-portal) |
| 라이브·녹화·다시보기 | [§8 Live Lessons](#8-live-lessons) |
| 에이전트/AI에 「design-system 따라」 | [AGENTS.md](../AGENTS.md) + [visual-direction.md](./visual-direction.md) |

**원칙:** 정책이 바뀌면 **이 문서의 요약 + 해당 상세 문서**를 함께 갱신한다.

---

## 1. 애플리케이션 구역 (Route Zones)

| 구역 | 경로 | 대상 | UI 톤 |
|------|------|------|--------|
| **Customer `(app)`** | `src/app/(app)/` | 로그인 회원 | **Corporate Trust** (indigo chrome) |
| **Coach Portal** | `/coach/*` | `COACH` 역할 | 별도 dark sidebar shell |
| **Admin** | `/admin/*` | `ADMIN` 역할 | Admin shell (violet accent) |
| **Auth `(auth)`** | `/login`, `/login/find-account`, `/signup/*` | 비로그인 | **GLIA Recovery Wellness** |
| **Legacy `(customer)`** | — | `/dashboard`·`/lms/*` **제거됨** | 신규 customer UI **금지** — `(app)`만 사용. `/dashboard` → `/`, `/lms/*` → `/learning` |

### 1.1 Customer `(app)` IA

| 모드 | 라우트 그룹 | 질문 | 예 |
|------|-------------|------|-----|
| **Tab** | `(tabs)/` | 「앱 어디로?」 | `/`, `/community`, `/learning` |
| **Stack** | `(stack)/` | 「이 과업을 끝낼까?」 | `/checkin/*`, `/mypage`, `/shop/*`, `/learning/[slug]/*` |

**1차 메뉴 (고정 4개):** 홈 · 커뮤니티 · 내학습 · 코칭 — 변경 시 [navigation-chrome-policy.md](./navigation-chrome-policy.md) 선행 갱신.

### 1.2 인증 · 미들웨어

| 정책 | 내용 |
|------|------|
| 보호 경로 | `/learning`, `/checkin`, `/orders`, `/coaching`, `/mypage`, `/admin`, `/coach` 등 — 세션 쿠키 없으면 `/login?next=` |
| Shop 공개 | `/shop`, `/shop/[id]` 목록·상세는 비로그인 조회. 신청·결제는 로그인 |
| 로그인 | 이메일 + Kakao OAuth (선택, env 설정 시) |
| Stack 로그인 필수 | `/mypage`, `/checkin/*` — 미로그인 redirect |
| 인증 UI (Mobile Stack) | immersive — 헤더 인증 버튼 **숨김** (Tab/PC unified header에서 접근) |

---

## 2. 역할 (Roles)

| Role | 포털 | 정책 |
|------|------|------|
| `CUSTOMER` | `(app)` | Shop·Learning·Coaching·Check-in |
| `COACH` | `/coach` | 본인 코스·상품·고객·라이브·코칭만 스코프. **`ADMIN`은 `/admin`으로 redirect** |
| `ADMIN` | `/admin` | 전역 catalog·주문·부여·조직 관리 SSOT |

**Coach vs Admin (Commerce)**

| 기능 | Admin | Coach |
|------|-------|-------|
| Product CRUD (전체) | ✅ | ❌ |
| Product CRUD (본인 콘텐츠 연결분) | ✅ | ✅ |
| Order / Refund | ✅ 전체 | ✅ **본인 상품 라인만** 조회 |
| Coaching entitlement 수동 부여 | ✅ | ✅ **본인 offering만** |
| Course / Curriculum | ✅ 전체 | ✅ **`Course.instructorId = coach`** |
| 사용자 역할 변경 (USER / COACH / ADMIN) | ✅ `/admin/users/[id]` | ❌ |

---

## 3. 도메인 개요 (Catalog → Instance → Grant)

```
[Catalog]     Product + ProductItem (COURSE_ACCESS / COACHING_ACCESS)
     ↓ 구매/부여
[Fulfillment] EntitlementGrant
     ↓
[Instance]    Enrollment (LMS)  |  CoachingEntitlement (코칭)
     ↓
[Access]      canAccessEnrollment / coaching session gate
```

**공통 원칙**

1. **Access ≠ Progress** — LMS `COMPLETED`(수료)여도 기간 내면 복습 가능.
2. **1 User × 1 Course = 1 Enrollment** — 재구매·연장은 row 갱신, **진도 보존**.
3. **Catalog 스냅샷** — 구매 시점 `accessDuration` / `validDays`를 Instance에 고정.
4. **다운그레이드 금지** — LIFETIME → FIXED_DAYS 전환 없음.

상세: [lms-access-entitlements.md](./lms-access-entitlements.md) · [lms-access-implementation.md](./lms-access-implementation.md)

---

## 4. Customer App `(app)`

### 4.1 적용 범위

- ✅ `src/app/(app)/`, shell·home·learning·community·shop·checkin·coaching 관련 components
- ❌ `admin`, `(customer)`, `(auth)`, `coach` — Corporate Trust **미적용** (별도 요청 시만)
- `(auth)` (`/login`, `/signup/*`) — **GLIA Recovery Wellness**. 아래 [§4.2a](#42a-auth--glia-recovery-wellness)

### 4.2 Corporate Trust

| 축 | 규칙 |
|----|------|
| Accent | indigo gradient — active nav, CTA, links (`--auth-primary`) |
| Surfaces | `--auth-bg` / `--auth-surface` / card shadow |
| Page headers | `TabPageHeader` on tab + stack L3 |
| Motion | 150–360ms, `prefers-reduced-motion` 필수 |
| Typography | `<Typography role="…">` / typo 토큰 — Tailwind `text-sm`/`text-lg` **금지** |

**한 줄 요청 (에이전트):** 「Corporate Trust」 / 「corp-trust」 / 「design-system 따라」

→ [visual-direction.md](./visual-direction.md) · `src/components/corporate-trust/`

### 4.2a Auth — GLIA Recovery Wellness

`/login`, `/login/find-account`, `/signup/*`는 작업 완수(focused-task) 화면. **카드 금지.** 타이포·여백·헤어라인으로 위계.

| 축 | 규칙 |
|----|------|
| Accent | GLIA Blue `#1E839E` · Primary Dark `#17677D` · mint/soft-blue ambience |
| Tokens | `src/app/design-tokens/glia.css` (`--glia-*`) |
| Scope | `.glia-auth` — `src/components/auth/glia/` |
| Font | Pretendard |
| 금지 | Indigo / Violet, Corporate Trust 카드 셸 |

**한 줄 요청:** 「GLIA」 / 「glia-auth」

### 4.3 Navigation & Chrome

- Tab × Stack × Mobile/Desktop **chrome matrix** — [navigation-chrome-policy.md](./navigation-chrome-policy.md)
- Mobile `(app)`: `100dvh` app shell, `#main-content` 단일 scroll
- 홈 `/` only: **Home Brand Hero** (L0 on-hero integrated)
- KRDS v1.0 접근성: skip links, 44px touch, `aria-current`, focus ring

**코드 SSOT:** `src/lib/chrome-policy.ts` · `src/components/shell/*`

### 4.4 브랜드 Placeholder

- UI에 특정 상호 **표기하지 않음** — 로고·슬로건 placeholder, 확정 후 교체

---

## 5. Commerce & LMS Access

### 5.1 Product 종류

| `ProductKind` | 구성 |
|---------------|------|
| `COURSE_ONLY` | VOD (LMS) |
| `COACHING_ONLY` | 코칭권 |
| `BUNDLE` | LMS + 코칭 |

### 5.2 수강 기간 (`AccessDurationKind`)

| 값 | `validUntil` |
|----|--------------|
| `LIFETIME` | `null` (평생) |
| `FIXED_DAYS` | `now + accessDays` |

우선순위: `ProductItem` → `Course.defaultAccessDuration` (admin grant fallback)

### 5.3 Shop CTA (`ProductShopState`)

| kind | 의미 |
|------|------|
| `purchase` | 신규 구매 |
| `owned` | 이미 동급 이상 보유 |
| `extend` | FIXED_DAYS **연장** (만료·유효) |
| `restore` | LIFETIME **복구** (만료 후) |
| `upgrade` | FIXED → LIFETIME |
| `partial` | VOD skip + 코칭만 추가 |

- 전 item `skip` → checkout **409 `ALREADY_OWNED`**
- **restore ≠ extend** — copy/UI 구분 필수

### 5.4 Learning Gate

| Enrollment status | 레sson 접근 (기간 내) |
|-------------------|----------------------|
| `ACTIVE` | ✅ |
| `COMPLETED` | ✅ (복습) |
| `EXPIRED` | ❌ → 만료 안내 + Shop 링크 |
| `DROPPED` / `SUSPENDED` | ❌ |

만료: **lazy materialize** (`validUntil < now` → `EXPIRED`)

**구현:** `src/lib/enrollment-access.ts` · `src/lib/shop-purchase-state.ts` · `src/lib/fulfillment.ts`

상세: [lms-access-implementation.md](./lms-access-implementation.md)

### 5.5 보류 (v1 미구현)

쿠폰, 연장 전용 SKU 가격, 업그레이드 차액, Admin ProductItem 기간 UI, drip/일시정지

---

## 6. Coaching (Customer)

| 정책 | 내용 |
|------|------|
| Entitlement | `CoachingOffering.validDays` · `totalSessions` 스냅샷 |
| Session | offering 템플릿 기준 회차 생성 |
| Publication | 코치 피드백 `DRAFT` → `PUBLISHED` |
| Check-in 접근 | 회원이 코치 사용자 ID를 검색해 전체 체크인 기록 접근을 허용·차단 (`CoachCheckInAccess`) |

Customer: `/coaching`, `/coaching/sessions/[id]`  
Coach: `/coach/coaching`, `/coach/sessions/[id]`

---

## 7. Coach Portal

**URL:** `/coach` · **역할:** `COACH` only

### 7.1 메뉴

| 메뉴 | 역할 |
|------|------|
| 홈 | 대시보드·통계·최근 코칭 세션 |
| 상품 | 본인 코스/오퍼링 연결 Product CRUD → Shop 노출 |
| 주문 | 본인 상품 포함 주문 조회 |
| 고객 | 수강·코칭권 보유 회원 통합 |
| 코스 | LMS curriculum · VOD/LIVE 레슨 편집 |
| 라이브 | 일정·시작·종료·다시보기 변환 |
| 코칭 | 세션·코칭권·오퍼링 |

### 7.2 소유권 스코프

- **Product:** 모든 `ProductItem`이 coach 소유 course/offering일 때만 목록·편집
- **Course:** `Course.instructorId = coachId`
- **CoachingOffering:** `coachId = coachId`
- **Customer detail:** coach 코스 수강 또는 coach 코칭권 보유자만

### 7.3 Coach LMS

| 레슨 타입 | 정책 |
|-----------|------|
| `VIDEO` | YouTube URL (iframe) |
| `TEXT` | BlockNote 본문 |
| `LIVE` | Zoom URL (`LINK` 콘텐츠) |
| 발행 | publish checklist 통과 후 `PUBLISHED` |

---

## 8. Live Lessons

### 8.1 운영 플로우

1. **라이브 전:** 코치가 LIVE 레슨에 Zoom URL 등록
2. **라이브 중:** 수강생 `/learning/...` → Zoom 입장 링크
3. **라이브 후:** LIVE 레슨 삭제 → **VIDEO 레슨 신규 생성** → YouTube URL 등록 (다시보기)

### 8.2 고객 UI

- Zoom URL 있음 → 「Zoom 입장하기」
- Zoom URL 없음 → 「Zoom 링크 미등록」 안내

### 8.3 코치 UI

- `/coach/lessons/[id]` — Zoom URL 입력
- `/coach/live` — LIVE 레슨 목록 · Zoom 등록 상태

**코드:** `src/lib/media/zoom.ts` · `src/lib/coach-live-lessons.ts` · `lesson-live-panel.tsx`

---

## 9. Admin

| 영역 | SSOT |
|------|------|
| Product / Order / Refund | `/admin/products`, `/admin/orders` |
| Enrollment / Entitlement grant | `/admin/enrollments`, `/admin/coaching/entitlements` |
| Course / Curriculum (전체) | `/admin/courses` |
| Coaching offerings (전체) | `/admin/coaching-offerings` |

Admin은 coach portal 기능의 **전역 superserset**. Coach는 본인 스코프만.

---

## 10. Community & Check-in (요약)

| 영역 | 정책 |
|------|------|
| **Community** | Markdown 게시글 · 댓글 · 좋아요 · `(app)` Tab `/community` |
| **Check-in** | Daily / Weekly · Stack `/checkin/*` · 사용자 관리형 코치 접근 권한 (`CoachCheckInAccess`) |

---

## 11. 기술 · 에이전트 규칙

| 항목 | 정책 |
|------|------|
| Next.js | **Training data와 다른 breaking API** — `node_modules/next/dist/docs/` 참고 ([AGENTS.md](../AGENTS.md)) |
| DB | Prisma + SQLite (dev) |
| 미디어 | YouTube (VOD) · Zoom (live) · R2 (BlockNote 이미지 등) |
| 커밋 | 사용자 요청 시에만 |
| Customer UI 작업 | App Tone v1 문서 세트 준수 |

---

## 12. 문서 인덱스

### Customer UI

| 문서 | 내용 |
|------|------|
| [policies.md](./policies.md) | **이 문서** — 정책 허브 |
| [screens/README.md](./screens/README.md) | **User 화면 명세** — 인벤토리·상태·플로우 |
| [screens/SCREEN-SPEC-GUIDE.md](./screens/SCREEN-SPEC-GUIDE.md) | **화면 spec 작성 틀** (섹션 0~8, UI Block) |
| [visual-direction.md](./visual-direction.md) | App Tone v1 요약 |
| [design-system.md](./design-system.md) | 토큰·컴포넌트·접근성 |
| [colors.md](./colors.md) | Palette |
| [typography.md](./typography.md) | Typography scale |
| [navigation-chrome-policy.md](./navigation-chrome-policy.md) | Tab/Stack chrome matrix |

### Commerce & LMS

| 문서 | 내용 |
|------|------|
| [lms-access-entitlements.md](./lms-access-entitlements.md) | 도메인·스키마 설계 |
| [lms-access-implementation.md](./lms-access-implementation.md) | Shop·Fulfillment·UI **구현 정책** |

### 에이전트

| 문서 | 내용 |
|------|------|
| [AGENTS.md](../AGENTS.md) | Cursor/에이전트 가이드 |
| [.cursor/rules/app-visual-direction.mdc](../.cursor/rules/app-visual-direction.mdc) | App Tone v1 cursor rule |

### 코드 정책 SSOT (참고)

| 영역 | 파일 |
|------|------|
| Chrome | `src/lib/chrome-policy.ts` |
| Enrollment access | `src/lib/enrollment-access.ts` |
| Shop state | `src/lib/shop-purchase-state.ts` |
| Coach commerce scope | `src/lib/coach-commerce.ts` |
| Live lessons (Zoom) | `src/lib/coach-live-lessons.ts` · `src/lib/media/zoom.ts` |
| Coach auth | `src/lib/coach.ts` |

---

## 13. 정책 변경 체크리스트

새 기능 추가 시:

- [ ] **구역** — `(app)` / coach / admin 중 어디인가?
- [ ] **역할** — CUSTOMER / COACH / ADMIN 접근 경계
- [ ] **IA** — Tab vs Stack ([navigation-chrome-policy](./navigation-chrome-policy.md))
- [ ] **Access** — Enrollment/Entitlement/grant action 영향
- [ ] **UI** — `(app)`이면 App Tone v1 준수
- [ ] **화면 명세** — [screens/](./screens/) 해당 md 갱신 (User-facing)
- [ ] **문서** — 이 hub + 해당 상세 doc 갱신

---

*Policy Hub v1 — Glia Online (online.glia.test)*
