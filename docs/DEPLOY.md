# Deploy — Vercel + Prisma Postgres

`online.glia` 프로덕션 배포 가이드 (gliadeveloper / Vercel 무료 Prisma Postgres).

## 1. GitHub 저장소

```bash
# 이미 gliadeveloper/online.glia 에 push 된 경우 생략
gh repo create gliadeveloper/online.glia --public --source=. --remote=origin --push
```

## 2. Vercel 프로젝트 연결

1. [vercel.com](https://vercel.com) → **Add New Project**
2. **Import** `gliadeveloper/online.glia`
3. Framework: **Next.js** (자동 감지)
4. Build Command (기본값 그대로): `prisma generate && prisma migrate deploy && next build`

### 필수 환경 변수 (Vercel → Settings → Environment Variables)

| 변수 | 설명 |
|------|------|
| `SESSION_SECRET` | 32자 이상 랜덤 문자열 (프로덕션 필수) |
| `DATABASE_URL` | Prisma Postgres 연결 시 **자동 주입** (아래 3단계) |

선택: `KAKAO_*`, `R2_*`(BlockNote 이미지 등) — [.env.example](../.env.example) 참고.

## 3. Prisma Postgres (무료) 연결

1. Vercel 대시보드 → 프로젝트 → **Storage** 탭
2. **Create Database** → **Prisma Postgres** → **Continue**
3. Region 선택, **Pricing: Free** ($0 — 100k ops / 500MB / 월)
4. DB 이름 예: `online-glia` → **Create**
5. 생성된 DB → **Connect** → 이 Vercel 프로젝트 선택 → **Connect**

`DATABASE_URL` 이 Production / Preview / Development 에 자동 설정됩니다.

공식 문서: [Prisma Postgres on Vercel](https://www.prisma.io/docs/guides/postgres/vercel)

## 4. 첫 배포 후 DB 스키마

빌드 시 `prisma migrate deploy` 가 `prisma/migrations/` 의 pending migration 을 적용합니다.

로컬에서 시드 (선택):

```bash
npm i -g vercel
vercel login
vercel link          # gliadeveloper/online.glia 선택
vercel env pull .env.development.local
cp .env.development.local .env   # 또는 DATABASE_URL만 .env에 복사
npm run db:seed
```

## 5. 로컬 개발 (PostgreSQL)

SQLite는 Vercel 배포에 사용할 수 없습니다. 로컬도 PostgreSQL URL이 필요합니다.

```bash
vercel env pull .env.development.local
# .env 에 DATABASE_URL 반영 후
npm install
npm run dev
```

## 6. 폴더 이름

저장소 이름은 `online.glia` 입니다. 로컬 폴더명도 맞추려면:

```bash
cd ~/Documents/GitHub
mv online.glia.test online.glia
```

## 7. 카카오 / OAuth redirect

프로덕션 도메인: **https://online.glia.kr**

[Kakao Developers](https://developers.kakao.com) → 앱 → **Redirect URI** 등록:

```
https://online.glia.kr/api/auth/kakao/callback
```

Vercel 환경 변수 (Production / Preview):

| 변수 | 값 |
|------|-----|
| `KAKAO_REST_API_KEY` | 카카오 REST API 키 |
| `KAKAO_CLIENT_SECRET` | (선택) Client Secret 사용 시 |
| `KAKAO_REDIRECT_URI` | `https://online.glia.kr/api/auth/kakao/callback` |

## 8. 런칭 전 체크리스트

- [ ] `npm run build` 성공 (로컬 또는 CI)
- [ ] Vercel `SESSION_SECRET`, `DATABASE_URL` 설정
- [ ] 카카오 Redirect URI: `https://online.glia.kr/api/auth/kakao/callback`
- [ ] 코스 publish: VIDEO(YouTube), LIVE(Zoom), TEXT(BlockNote) 콘텐츠 등록
- [ ] TEXT 이미지 사용 시 `R2_*` env 설정

## 트러블슈팅

| 증상 | 조치 |
|------|------|
| `DATABASE_URL is required` | Vercel Storage에서 Prisma Postgres Connect |
| `P1017` / `Server has closed the connection` | DB 연결 끊김 — `npm run dev` 재시작, `.env`의 `DATABASE_URL` 확인, `vercel env pull`로 최신 URL 갱신. Prisma Postgres 무료 티어는 idle 후 sleep → 첫 요청이 느릴 수 있음 |
| migrate deploy 실패 | Vercel 빌드 로그 확인, DB가 postgres인지 확인 |
| design-tokens 오류 | `src/app/design-tokens/` 폴더 포함 여부 확인 |
