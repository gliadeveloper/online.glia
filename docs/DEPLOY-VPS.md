# VPS (iwinv) 프로덕션 배포 — Docker Compose

`gna_2.4_n` (vCPU 2 · RAM 4GB · NVMe 50GB) 한 대에 **PostgreSQL + Next.js** 를 올리는 초기 운영 가이드입니다.

> Vercel 배포는 [DEPLOY.md](./DEPLOY.md) 를 따르세요. 이 문서는 **자체 VPS** 전용입니다.

## 아키텍처

```
[인터넷] → (443) nginx/Caddy → localhost:3000 [app container]
                                      ↓
                               [db container] PostgreSQL 16
```

- DB는 Docker 내부 네트워크만 노출 (`5432` 외부 개방 금지)
- 앱은 `127.0.0.1:3000` 에만 바인딩 → nginx가 리버스 프록시

## 0. 사전 준비

| 항목 | 권장 |
|------|------|
| OS | Ubuntu 22.04 / 24.04 LTS |
| 도메인 | `online.glia.kr` → VPS 공인 IP A 레코드 |
| Git | private repo면 deploy key 또는 PAT |
| 방화벽 | 22(SSH), 80, 443 만 개방 |

## 1. iwinv 콘솔 — 서버 생성

1. **이미지**: Ubuntu 22.04 LTS (또는 24.04)
2. **스펙**: `gna_2.4_n` (2 vCPU / 4GB / 50GB)
3. **보안**: SSH 키 등록 (비밀번호 로그인 비활성화 권장)
4. 생성 후 **공인 IP** 확인

## 2. 서버 초기 설정 (SSH)

```bash
ssh root@YOUR_SERVER_IP

# 패키지 & Docker
apt update && apt upgrade -y
apt install -y git curl ufw

curl -fsSL https://get.docker.com | sh
apt install -y docker-compose-plugin

# 방화벽
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# 배포용 사용자 (선택)
adduser deploy
usermod -aG docker deploy
```

## 3. 코드 배치

```bash
su - deploy   # 또는 root 그대로
git clone https://github.com/gliadeveloper/online.glia.git
cd online.glia
```

## 4. 환경 변수

```bash
cp deploy/env.production.example .env
nano .env
```

**반드시 바꿀 값:**

| 변수 | 설명 |
|------|------|
| `POSTGRES_PASSWORD` | DB 비밀번호 (강력하게) |
| `DATABASE_URL` | 위 비밀번호와 동일하게 `@db:5432` 호스트 |
| `SESSION_SECRET` | `openssl rand -base64 32` 결과 |
| `KAKAO_REDIRECT_URI` | 실제 접속 URL (도메인 또는 `http://IP/api/auth/kakao/callback`) |

```bash
# 예: 시크릿 생성
openssl rand -base64 32
```

## 5. 빌드 & 기동

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

- `db` → healthy
- `migrate` → `prisma migrate deploy` (스키마 적용)
- `app` → Next.js `:3000`

로그 확인:

```bash
docker compose -f docker-compose.prod.yml logs -f app
curl -I http://127.0.0.1:3000
```

### (선택) 시드 데이터

데모 계정·샘플 코스가 필요할 때 **최초 1회**:

```bash
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

시드 계정: `admin@localhost` / `demo-password` (프로덕션에서는 비밀번호 변경 또는 시드 생략)

## 6. HTTPS — Caddy (권장, 자동 Let's Encrypt)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```
online.glia.kr {
    reverse_proxy 127.0.0.1:3000
}
```

도메인 없이 IP만 쓸 때 (HTTP, 테스트용):

```
:80 {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

## 6-alt. HTTPS — nginx + certbot

`deploy/nginx/online.glia.conf` 를 참고해 `/etc/nginx/sites-available/online.glia` 에 복사 후:

```bash
sudo ln -s /etc/nginx/sites-available/online.glia /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d online.glia.kr
```

## 7. 카카오 OAuth

[Kakao Developers](https://developers.kakao.com) → 앱 → Redirect URI:

```
https://online.glia.kr/api/auth/kakao/callback
```

`.env` 의 `KAKAO_*` 설정 후:

```bash
docker compose -f docker-compose.prod.yml up -d app
```

## 8. 배포 업데이트 (재배포)

```bash
cd ~/online.glia
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

마이그레이션만 다시:

```bash
docker compose -f docker-compose.prod.yml run --rm migrate
```

## 9. 운영 체크리스트

- [ ] `curl -I https://online.glia.kr` → 200/302
- [ ] 로그인 (이메일 또는 카카오)
- [ ] `SESSION_SECRET` 기본값 미사용
- [ ] PostgreSQL 5432 외부 미개방 (`ss -tlnp | grep 5432` → 127.0.0.1 또는 docker only)
- [ ] TEXT 레슨 이미지 사용 시 `R2_*` 설정
- [ ] 시드 demo 비밀번호 변경 또는 시드 미실행

## 10. 리소스 & 디스크 (4GB RAM)

| 서비스 | 메모리 limit |
|--------|----------------|
| PostgreSQL | 1GB |
| Next.js app | 1.5GB |
| OS + Caddy/nginx | ~500MB 여유 |

디스크: PostgreSQL volume `pgdata` + Docker 이미지. 50GB 중 **20GB 이상 여유** 유지 권장.

백업 (수동):

```bash
docker compose -f docker-compose.prod.yml exec db \
  pg_dump -U glia online_glia > backup-$(date +%F).sql
```

## 11. 트러블슈팅

| 증상 | 조치 |
|------|------|
| `migrate` 실패 | `.env` 의 `DATABASE_URL` 호스트가 `db` 인지, `POSTGRES_PASSWORD` 일치 확인 |
| `app` OOM / 느림 | `docker stats` — 빌드는 로컬에서 `--build` 후 push, 또는 swap 2GB 추가 |
| 502 Bad Gateway | `docker compose ps` — app running? `curl localhost:3000` |
| 카카오 redirect mismatch | Kakao 콘솔 URI ↔ `KAKAO_REDIRECT_URI` 완전 일치 |
| R2 이미지 503 | `R2_*` env 누락 — BlockNote 이미지 업로드 불가 |

## 12. Vercel과 병행?

초기 VPS 운영 후 Vercel로 옮길 수 있습니다. DB만 VPS PostgreSQL → Prisma Postgres 등으로 덤프/복원하면 됩니다. 반대로 VPS 단독 운영 시 Vercel Storage는 불필요합니다.
