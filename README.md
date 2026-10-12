# Online Glia

Next.js + Prisma 7 + PostgreSQL (Prisma Postgres on Vercel).

## 로컬 개발

```bash
npm install
# 서버 값은 .env, 로컬 값은 .env.local (next dev · prisma 가 .env 를 덮어씀)
npm run dev
```

## 배포

| 환경 | 문서 |
|------|------|
| **Vercel + Prisma Postgres** | [docs/DEPLOY.md](./docs/DEPLOY.md) |
| **iwinv VPS (Docker + PostgreSQL)** | [docs/DEPLOY-VPS.md](./docs/DEPLOY-VPS.md) |

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | migrate deploy + Next.js 빌드 |
| `npm run db:migrate` | 마이그레이션 (dev) |
| `npm run db:seed` | 시드 데이터 |

## 기술 스택

- Next.js 16 (App Router)
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- Tailwind CSS 4 · App Tone v1 (`docs/design-system.md`)
