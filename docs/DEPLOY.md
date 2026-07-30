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

선택: `KAKAO_*`, LiveKit, R2 등은 기능 사용 시 추가.

## 3. Prisma Postgres (무료) 연결

1. Vercel 대시보드 → 프로젝트 → **Storage** 탭
2. **Create Database** → **Prisma Postgres** → **Continue**
3. Region 선택, **Pricing: Free** ($0 — 100k ops / 500MB / 월)
4. DB 이름 예: `online-glia` → **Create**
5. 생성된 DB → **Connect** → 이 Vercel 프로젝트 선택 → **Connect**

`DATABASE_URL` 이 Production / Preview / Development 에 자동 설정됩니다.

공식 문서: [Prisma Postgres on Vercel](https://www.prisma.io/docs/guides/postgres/vercel)

## 4. 첫 배포 후 DB 스키마

빌드 시 `prisma migrate deploy` 가 `prisma/migrations/20260730180000_init_postgres` 를 적용합니다.

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

프로덕션 도메인 배포 후 Kakao Developers 에 redirect URI 추가:

```
https://<your-vercel-domain>/api/auth/kakao/callback
```

`KAKAO_REDIRECT_URI` 환경 변수도 동일 URL로 설정.

## 트러블슈팅

| 증상 | 조치 |
|------|------|
| `DATABASE_URL is required` | Vercel Storage에서 Prisma Postgres Connect |
| migrate deploy 실패 | Vercel 빌드 로그 확인, DB가 postgres인지 확인 |
| design-tokens 오류 | `src/app/design-tokens/` 폴더 포함 여부 확인 |
