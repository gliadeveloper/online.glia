# Online Glia Test

Next.js + Prisma 기반 로컬 개발 프로젝트입니다.

## 기술 스택

- **Next.js 16** (App Router, TypeScript, Tailwind CSS)
- **Prisma 7** + **SQLite** (로컬 파일 DB, 별도 서버 불필요)
- 개발 서버: `http://localhost:3000`

## 시작하기

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env

# DB 마이그레이션
npm run db:migrate

# (선택) 시드 데이터
npm run db:seed

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 열면 Prisma로 조회한 User 목록을 확인할 수 있습니다.

## 주요 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | Next.js 개발 서버 (localhost:3000) |
| `npm run build` | Prisma Client 생성 후 프로덕션 빌드 |
| `npm run db:migrate` | 마이그레이션 생성 및 적용 |
| `npm run db:push` | 스키마를 DB에 바로 반영 (프로토타입용) |
| `npm run db:studio` | Prisma Studio (localhost:5555) |
| `npm run db:seed` | 시드 데이터 삽입 |

## API

- `GET /api/health` — DB 연결 상태 확인
- `GET /api/users` — 사용자 목록
- `POST /api/users` — 사용자 생성 (`{ "email": "...", "name": "..." }`)

## PostgreSQL로 전환하기

로컬 PostgreSQL을 쓰려면 `prisma/schema.prisma`의 `provider`를 `postgresql`로 바꾸고, `.env`의 `DATABASE_URL`을 아래처럼 설정하세요.

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/online_glia_test?schema=public"
```

그다음 `npm run db:migrate`를 다시 실행하면 됩니다.
