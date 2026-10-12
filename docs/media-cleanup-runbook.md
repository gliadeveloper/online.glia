# 미디어 정리 worker 실행 지침

작성: 2026-10-09. [정책 2의 19절](./media-asset-database-design.md#19-격리-환경-정리-worker와-utc-시각-계약--2026-10-09)이 현재 구현 기준이다. **운영 자동 삭제는 비활성**이며 이 도구는 격리 검증용이다. 배포·스케줄러·R2 수명 규칙은 이번 변경으로 실행되지 않는다.

## 실행 범위

`npm run media:cleanup`은 한 번 실행하고 종료한다. 기본값은 DB 후보 조회만 수행하는 dry-run이다. `--limit`은 작업군마다 1–100개, 기본 25개다. 만료 업로드, 자산 삭제, staging, 최종 잔여 파일 네 작업군을 합쳐 기본 최대 100개 후보를 조회한다. 한 자산의 삭제에는 그 자산의 파일들이 포함된다. 새로 폐기된 업로드의 정리 후보는 다음 실행에서 조회될 수 있다.

결과는 `mode`, `results[{kind,id,outcome}]` JSON이다. 후보 조회는 실행 시점의 자격 확정을 뜻하지 않는다. 실제 실행은 잠금 후 다시 판단한다. 출력에 파일명·R2 key·사용자 본문·자격 증명을 넣지 않는다.

- `CANDIDATE`: 읽기 전용 후보. DB·R2 변경 없음.
- `ABANDONED`: 만료 준비 작업의 공개 자격 폐기 및 두 경로 정리 예약.
- `ABSENT`: DELETE 뒤 HEAD에서 부재 관측. 다음 점검 예약 유지.
- `SUCCEEDED`: 자산의 알려진 최종 파일 삭제 확정. 잔여 점검은 계속됨.
- `SKIPPED`: 잠금 후 자격 없음, 보호 대상, 다른 유효한 선점 또는 key/버킷 불일치. 출력 ID로 행을 조사한다. 반복되는 SKIPPED가 조회 상한을 차지하면 운영 전 원인을 해결한다.
- `RETRY`, `STORAGE_FAILED`, `OBJECT_PRESENT`: 지연 정리. 예약 시각 이후 다시 실행한다.
- `LOST_CLAIM`: 임대 또는 sweep 선점 만료/교체로 결과 기록 거절. 현재 소유자가 처리하거나 선점 만료 후 재시도한다.
- `WORKER_FAILED`: DB·감사 기록 등 작업 오류. 이미 커밋된 선점은 남을 수 있으며 만료 후 회수한다. raw 오류를 출력하지 않는다.

마지막 다섯 오류·지연 결과가 있으면 CLI 종료 코드는 1이다. 설정 오류도 1, 성공한 후보 조회/처리와 SKIPPED만 있으면 0이다. 종료 코드 0만으로 모든 자산 정리가 완료됐다고 판단하지 않는다.

## 설정

프로젝트 `.env`와 일반 `DATABASE_URL`·`R2_*`는 자동 사용하지 않는다. 명시적인 전용 환경변수 또는 `--env-file`만 사용한다. 자격 증명 파일은 저장소 밖에 두고 접근 권한을 제한한다.

```dotenv
MEDIA_CLEANUP_DATABASE_URL=postgresql://testuser@127.0.0.1:5432/media_cleanup_sandbox
MEDIA_CLEANUP_R2_BUCKET=glia-media-test
```

```sh
npm run media:cleanup -- --env-file /secure/cleanup.env --limit 25
```

실제 격리 환경에서 처리하려면 위 설정에 다음을 추가한다.

```dotenv
MEDIA_CLEANUP_ENVIRONMENT=isolated
MEDIA_CLEANUP_R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
MEDIA_CLEANUP_R2_ACCESS_KEY_ID=TEST_BUCKET_KEY
MEDIA_CLEANUP_R2_SECRET_ACCESS_KEY=TEST_BUCKET_SECRET
```

```sh
npm run media:cleanup -- --env-file /secure/cleanup.env --apply --confirm-bucket glia-media-test
```

apply는 loopback 호스트의 `media_cleanup_` 접두사 DB, `isolated` 환경 표시, 정확히 일치하는 버킷 확인 인수가 필요하다. DB URL의 query/hash는 apply에서 거절한다. 버킷 이름은 `-dev` 또는 `-test`로 끝나야 하며, 현재 운영 버킷 `online-glia`는 거절한다. DB 이름·버킷 이름이 실제 격리를 대신하지 않으므로 해당 테스트 DB와 버킷에만 접근 가능한 계정을 사용한다. 이 절차는 운영 삭제 활성화 절차가 아니다.

서비스 코드도 해당 버킷 및 CANONICAL 자산에만 적용한다. LEGACY는 분류가 끝났더라도 이 단계에서 삭제하지 않는다. CANONICAL 파일은 자산·소유자·파일·준비 작업 ID로 계산한 경로와 DB key가 일치해야 한다. 모든 파일의 버킷·경로가 맞아야 자산 삭제를 선점한다. R2 LIST나 prefix 삭제는 사용하지 않는다.

## 재시도와 관측

삭제 job의 임대는 5분이다. 각 파일 처리 전에 현재 토큰의 임대를 갱신하며, 파일 관측/감사와 최종 상태 변경은 유효한 토큰 조건을 마지막에 다시 검사한다. 실패 시 자산은 DELETING이고 job은 RETRY다. RUNNING 도중 종료된 프로세스는 임대 만료 후 회수한다.

별도 sweep은 `stagingCleanupDueAt` 또는 `nextSweepAt`을 5분 뒤로 예약해 선점한다. 기록한 시각과 DB 현재 시각을 확인하는 조건부 UPDATE가 성공해야 관측과 감사가 함께 커밋된다. 이전 응답이 새 선점의 시각·성공 관측을 바꿀 수 없다. 선점·결과 감사는 별도 행으로 보존한다. 이 시각 필드는 운영자가 직접 바꾸지 않는다.

실패는 30초에서 시작하는 지수 backoff에 0–25% jitter를 더한다. 기본 지연 상한은 1시간이다. 삭제 횟수는 job의 `attemptCount`, sweep 횟수는 AuditLog의 선점·결과 연결로 이어간다. 정상 부재 관측 후에는 24시간 뒤 다시 점검한다. 과거의 부재 관측은 이력이며 실패했다고 없애거나 영구 종료 표시로 사용하지 않는다.

보호 조건은 각 선점에서 확인한다. 이미 발송한 저장소 요청을 이후 DB 상태 변경으로 취소할 수는 없다. READY 원본/파생본은 잔여 정리 대상이 아니며, READY 자산의 폐기된 파생본만 별도로 정리할 수 있다. DELETING 최종 파일은 삭제 job이 담당한다. 키 불일치·hold·분류 대기는 자동으로 해제하지 않는다.

## 시간대와 기존 데이터 점검

앱·worker의 Prisma 연결은 UTC startup 옵션을 적용하고, 미디어 트랜잭션은 `SET LOCAL TIME ZONE 'UTC'`를 적용한다. 이번 검증에서 설치된 `@prisma/adapter-pg` 7.9.1의 날짜 매개변수/결과 변환이 DB의 UTC 세션을 전제함을 확인했다. KST 세션에서 UTC 입력 시각이 9시간 이른 절대 시각으로 저장되는 경우가 재현됐다. 단순 Prisma 저장→조회 비교만으로는 같은 방향의 변환 오류가 가려질 수 있어 DB epoch와 직접 비교한다. 시간대 표시 없는 입력을 세션 시간대로 해석하는 동작은 [PostgreSQL 날짜·시각 문서](https://www.postgresql.org/docs/current/datatype-datetime.html)에 설명돼 있다.

연결 설정 반영에는 앱 재시작 또는 pool 재생성이 필요하다. 기존 날짜를 일괄 9시간 이동하지 않는다. 기존 행은 생성 경로와 당시 세션 시간대가 다를 수 있으므로 만료·휴지통 유예·임대 시각의 실제 epoch를 별도로 대조한다. 운영 연결 pooler가 UTC startup/트랜잭션 설정을 처리하는지 배포 검증에 포함한다.

## 확인한 범위와 남은 관문

`MEDIA_UPLOAD_LIVE=0 npm run test:media-db`는 임시 PostgreSQL·가짜 저장소를 사용한다. 실제 R2 DELETE·HEAD 네트워크, CORS, 장애 지연, late PUT의 실제 도착 순서는 아직 검증하지 않았다. 설치한 SDK 명령의 key·버킷 전달과 HEAD 0바이트/404/403 판정은 가짜 SDK 응답으로 검사한다.

운영 활성화 전에는 기존 파일 등록/backfill·사용처 전체 대조, 기존 시각 검토, 실제 R2 장애/잔여 객체 실험, DB·pooler 배포 검증, 처리량·감사 이력 증가량·작업 지연 관측과 알림, staging 수명 규칙, 정기 실행 책임자를 확정해야 한다. 이 지침을 실행했다고 그 관문을 통과한 것으로 간주하지 않는다.
