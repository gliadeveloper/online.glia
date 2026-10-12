# 실제 R2 미디어 검사와 기존 자산 등록 사전 명세

기준: 2026-10-09. [저장 정책](./media-r2-folder-structure.md)과 [DB 정책](./media-asset-database-design.md)을 따른다. **개발용 버킷의 브라우저 검사, 오프라인 등록 명세, 별도 로컬 DB의 등록 리허설**을 제공한다. 운영 DB 등록·배포·R2 이동·삭제 명령은 제공하지 않는다.

## 1. 실제 R2 검사

```sh
MEDIA_UPLOAD_LIVE=1 npm run test:media-db
```

필요한 것은 로컬 PostgreSQL 실행 파일, ffmpeg/ffprobe, 설치된 Chrome, 그리고 `.env.local`의 **`online-glia-dev` 전용 R2 설정**이다. 다른 위치를 쓸 때는 `MEDIA_R2_LIVE_ENV_FILE=/secure/test.env`를 지정한다. 테스트 harness가 만든 `/tmp/media-db-*` Unix socket DB만 허용한다. 운영 복원본이나 현재 앱 DB를 테스트 DB로 지정하지 않는다.

라이브 검사는 `.env.local`에서 R2 설정만 읽고 검사 후 이전 환경값을 복원한다. 계정 endpoint, 빈 legacy prefix, 정확한 개발 버킷 이름을 확인한다. 기본 `MEDIA_UPLOAD_LIVE=0` 검사에는 R2 요청이나 브라우저 실행이 없다.

[실행 코드](../scripts/media-r2-live.integration.ts)는 다음 합성 파일을 만든다.

- PNG 이미지 → 코치의 개인 자료.
- H.264/AAC MP4 영상, 약 3초 → 관리자 등록 공통 자료.
- MP3 오디오, 약 3초 → 코치의 개인 자료.
- AAC M4A 오디오, 약 3초 → 관리자 등록 공통 자료.

각 파일은 실제 Chrome에서 presigned PUT으로 전송하고 앱의 업로드 완료 함수를 호출한다. 실제 바이트 SHA-256·용량·전체 디코딩 검증, READY 전환, 동일 완료 요청의 재실행을 확인한다. 브라우저에서는 이미지 디코딩 또는 영상·오디오 재생, 1.5초 위치 탐색, Range 206·범위 초과 416, 비허용 사용자 404와 private 캐시를 확인한다.

### 브라우저 시험의 범위

브라우저 origin은 `http://localhost:3000`이다. 로컬 문서와 미디어 요청 전달부만 테스트 fixture로 공급하므로 이미 실행 중인 3000번 포트의 앱에 접속하거나 이를 중단하지 않는다. R2 PUT·CORS 응답은 가로채서 성공시킨 것이 아니라 실제 R2와 통신한다. 브라우저 보안 옵션을 끄지 않는다.

미디어 GET은 실제 `resolveMediaLocation`·`createMediaGetHandler`·R2 어댑터를 거친 결과를 브라우저에 전달한다. fixture는 지정된 테스트 사용자로 권한 함수를 호출한다. **실제 로그인 쿠키·화면 편집·Next 서버 전체를 통과하는 E2E 검사는 아니다.** 작은 합성 파일의 전달부는 메모리에 담아 브라우저로 보내므로 대용량 스트리밍·메모리 한도 검증도 별도로 필요하다.

현재 개발 버킷은 `localhost:3000`과 `127.0.0.1:3000`의 PUT 사전 요청이 허용됨을 확인했다. `127.0.0.1:3215`는 403이다. 버킷 CORS 설정 자체를 읽는 요청은 403이며, 설정 내용 전체를 확인하거나 변경한 것은 아니다. 운영 도메인의 CORS와 공개 URL 설정은 별도 관문이다.

### 시험 파일 정리와 실패

생성한 staging/최종 key를 새 제한 임시 디렉터리의 manifest에 기록한 뒤 업로드한다. 종료 시 **해당 실행에서 만든 key만** 삭제하고 HEAD 404를 확인한다. 네 파일이면 여덟 객체다. prefix 일괄 삭제나 다른 테스트·운영 객체 삭제를 하지 않는다.

실패하면 `LIVE_MEDIA_FAILED:<형식>:<단계>`만 출력한다. 서명 URL이나 자격 증명은 오류에 포함하지 않는다. 정리 실패나 업로드 결과 불명확 시 manifest를 보존한다. PUT 응답이 유실됐다면 일시적인 HEAD 404만으로 늦은 객체가 다시 생기지 않는다고 단정하지 않고, 보존한 key로 후속 확인한다. 테스트 객체 정리는 운영 삭제 worker 검증을 대신하지 않는다.

## 2. 기존 자산 등록 사전 명세

```sh
npm run media:backfill-plan -- \
  --config /secure/audit/config.json \
  --snapshot /secure/audit/snapshot.json \
  --inventory /secure/audit/inventory.json \
  --out /secure/new-backfill-review
```

입력은 [읽기 전용 대조 도구](./media-audit-runbook.md)의 같은 설정·DB 참조 스냅샷·전체 R2 목록이다. 설정 지문 불일치, 불완전한 목록, 일부만 생성된 미디어 스키마는 거절한다. 주소 설정을 바꿀 때에는 DB 참조 스냅샷을 다시 만든다.

이 CLI에는 `--apply`·live 모드·DB/R2 자격 증명 입력이 없다. [사전 명세 생성기](../scripts/media-audit/backfill-plan.ts)는 네트워크에 연결하지 않는다. `plan.private.json`과 마지막 완료 표지 `manifest.json`을 새 디렉터리에만 생성한다. 디렉터리는 0700, 파일은 0600이며 기존 결과 덮어쓰기는 거절한다. 실제 운영 입력과 출력은 Git 밖의 제한 폴더에 보관한다.

각 물리 객체는 한 항목이며 다음을 담는다.

- 정확한 bucket/objectKey와 검증된 논리 URL 별칭, 목록에서 관측한 크기·ETag·수정 시각.
- 등록된 파일이 있다면 기존 asset/file ID. 새 자산으로 중복 등록하지 않는다.
- 코스·코칭의 예상 사용처와 각 본문 버전. BlockNote와 마크다운의 같은 참조는 최댓값으로 합산하고, 서로 다른 콘텐츠 사용처는 각각 유지한다.
- 범위 밖 소비자, 문자열로만 관측한 가능 참조, 추가 검토 사유.
- 미등록 legacy 자료의 제안 분류 `UNCLASSIFIED`, 소유자 null. 현재 코치를 소유자로 지정하거나 확장자만으로 kind·verifiedAt·내용 해시를 채우지 않는다.

주요 판정:

- `REVIEW_FOR_REGISTRATION`: 본문 참조와 목록 위치가 맞는 등록 검토 자료. 실제 등록 승인이나 READY 판정이 아니다.
- `PRESERVE_UNREFERENCED`: 참조가 없는 보관 자료. 유지하며 사용처를 만들어 넣지 않는다.
- `PRESERVE_OUTSIDE_SCOPE`: 코스·코칭 미디어 경로 밖 자료. 현재 제공 경로를 유지한다.
- `BLOCKED_MISSING_OBJECT`: 참조는 있지만 전체 목록에 없는 객체. 복구·재대조 전 등록하지 않는다.
- `REVIEW_EXTERNAL_CONSUMER`: 다른 기능에서도 사용하는 자료. hold만으로 기존 열람 권한을 보존할 수 없으므로 별도 접근 정책 검토가 필요하다.
- `REVIEW_BEFORE_REGISTRATION` / `REVIEW_POSSIBLE_REFERENCE`: 본문 버전·문맥·여러 URL 별칭·가능 참조 등의 확인이 필요하다.
- `KEEP_REGISTERED`: 기존 등록 객체 재사용. 변경이나 재검증 완료를 뜻하지 않는다.

모든 항목의 `applyAllowed`·`deletionAllowed`는 false다. 보고서의 `complete`는 파일 생성이 끝났다는 뜻이며 조사 범위·권한 검토가 끝났다는 뜻이 아니다. 원래 대조의 미조사 필드와 제외 테이블도 명세에 남긴다.

## 3. 실제 등록 도구를 만들 때의 다음 조건

1. 최종 원본 DB·R2 관측을 갱신하고 본문 버전과 위치를 다시 비교한다. 현재 명세는 과거 관측의 검토 자료다.
2. 코스·코칭 사용 중인 후보부터 정확한 원본을 읽어 형식·해시·전체 디코딩을 확인한다. 내용 검증 전에는 READY를 기록하지 않는다.
3. 파일이 없거나 소유자가 불명확하다는 이유로 다른 객체나 공통 자료로 대체하지 않는다. 미확인 소유는 UNCLASSIFIED로 유지한다.
4. 파일 하나·원본 하나, 본문·MediaUsage·감사 기록의 원자성, 중단 후 재실행·이미 등록된 객체 재사용을 구현한다. 여러 URL이 같은 객체를 가리킬 때의 호환도 먼저 해결한다.
5. 기존 수강자·코칭 회원·관리자의 읽기 권한이 바뀌지 않는지 검사한다. 아바타·커뮤니티·수업자료 등 다른 소비자가 함께 쓰는 자료는 기존 접근을 보존할 때까지 등록을 보류한다.
6. 깨끗한 복원 DB에 검증된 변환만 재현한다. 운영 자동 삭제는 계속 별도 관문으로 유지한다.

실행 결과는 [운영 이전 기록](./production-migration-rehearsal-2026-10-09.md#8-후속-검증-브라우저-미디어와-등록-사전-명세)에 있다.

## 4. 로컬 복제 DB 등록 리허설

[`media:backfill-rehearse`](../scripts/media-backfill-rehearse.ts)는 원본 복원본과 분리한 새 DB에서만 사용한다. 기존 `source_snapshot`·`migration_rehearsal`과 현재 앱 DB는 대상이 아니다. 별도의 앱·worker를 이 DB에 연결하지 않는다.

```sh
npm run media:backfill-rehearse -- \
  --apply-local \
  --local-db-env /secure/backfill-rehearsal.env \
  --r2-env /secure/source-r2.env \
  --config /secure/audit/config.json \
  --expected-bucket online-glia \
  --legacy-prefix online-glia/ \
  --out /secure/new-backfill-run
```

DB는 명시한 파일의 `DATABASE_URL`만 읽으며, `127.0.0.1`·명시적 포트·`media_backfill_rehearsal_`로 시작하는 DB 이름을 검사한다. query의 host/options override와 다른 DB 이름은 거절한다. 이 검사는 실수 방지 장치이며, 로컬 포트가 운영 DB로 포워딩되어 있다면 안전한 격리가 아니다. 실행자가 해당 포트의 **실제 로컬 복원 컨테이너**를 확인해야 한다. 운영용 실행 옵션은 없다.

R2는 별도 명시 파일의 자격 증명으로 LIST·HEAD·If-Match GET만 사용한다. 대상 버킷을 인수와 대조하고, 이전 endpoint의 버킷 경로를 제거하는 경우 `--legacy-prefix`와 조사된 aliases가 모두 정확히 일치해야 한다. 객체 복사·PUT·DELETE는 하지 않는다. **메타데이터 대조 단계와 달리 이 리허설은 원본 본문을 읽는다.**

### 검증 및 등록 절차

1. 복제 DB의 참조와 R2 전체 목록을 새로 읽고 명세를 다시 만든다. 이전 검토 파일의 `applyAllowed: false`를 true로 바꾸어 사용하지 않는다. 외부 소비자·복수 URL·미확인 필드·파싱 실패가 있는 후보는 등록하지 않는다. 이미 검토한 두 컬럼은 현재 값까지 재검사한다.
2. 원본의 크기·ETag·수정 시각을 대조하고 조건부 GET으로 제한 임시 파일에 받는다. 최대 500MiB/파일, 100개·5GiB/실행이며 기본은 순차 처리다. `--concurrency 2`를 명시하면 최대 두 파일만 동시에 처리한다. 확장자는 검증기에 줄 형식 후보만 정한다. signature·SHA-256·전체 디코딩을 확인해야 READY를 기록할 수 있다. 기존 디코더의 시간·픽셀·트랙 제한을 낮추거나 우회하지 않는다.
3. GET 전후 및 DB 반영 직전에 HEAD를 재확인한다. R2 목록의 밀리초와 HTTP HEAD의 초 정밀도 차이는 초 단위로 비교하되 크기·ETag는 정확히 일치해야 한다. ETag는 변경 감지 조건이며 내용 해시를 대체하지 않는다. R2와 DB는 하나의 트랜잭션이 아니므로 마지막 HEAD 이후의 외부 변경까지 막지는 못한다. **최종 운영 반영에는 별도 쓰기 중단과 최신 대조가 필요하다.**
4. 콘텐츠 ID 순으로 잠그고 본문 버전·출현 횟수를 다시 읽는다. 객체 식별자에 대한 트랜잭션 advisory lock과 DB UNIQUE로 동시 중복 등록을 막는다. 새 자산과 원본을 PENDING으로 만들고, 같은 트랜잭션 안에서 검증된 원본 READY → 자산 READY → 모든 사용처 → 감사 기록을 처리한다. 본문·URL·BlockNote JSON 자체는 수정하지 않는다.
5. 신규 자산은 `LEGACY + UNCLASSIFIED`, 소유자/생성자 null, `retentionHold = LEGACY_BACKFILL_REHEARSAL`로 기록한다. 실제 원본 이름을 모르면 `기존 미디어.{형식}` 표시명을 사용한다. 물리 bucket/key와 기존 논리 urlKey를 그대로 기록한다. 새 업로드 세션이나 삭제 작업을 만들지 않는다.
6. 복제 DB의 사용자마다 기존 legacy 접근 함수와 등록 자산 접근 함수를 비교한다. 기존 접근자 한 명이라도 차단되면 그 파일의 자산·원본·사용처·감사 기록 전체가 롤백된다. 추가 접근자는 실제 사용처의 열람 권한으로 허용된 사용자이며 제한 보고서·감사 기록에 별도로 남긴다. 이 경우도 최종 공개 전 정책 검토 대상이다.

### 재실행, 실패, 증거

- 파일별 커밋이다. 중간 실패 후 앞선 성공은 유지되며 실패 항목에는 READY 행을 남기지 않는다. 기존 항목의 내용·상태·사용처가 기대값과 다르면 덮어쓰거나 자동 복구하지 않는다.
- 새 출력 폴더를 지정해 다시 실행하면 이미 등록된 파일은 검증 기록과 새 HEAD·현재 본문·사용처·권한을 대조해 재사용한다. 내용 검증이 없는 기존 행을 READY로 올리지 않는다. 기존 감사 기록을 중복 생성하지 않는다.
- 디렉터리 0700·파일 0600. 원본 본문은 파일별 성공/처리한 오류 모두에서 제거한다. SIGKILL·기기 중단은 finally를 실행하지 못할 수 있으므로, 중단 실행의 `body-*` 디렉터리는 실행 프로세스가 끝난 것을 확인하고 수동 정리한다. 원격 R2 객체는 정리하지 않는다.
- 입력 스냅샷·목록·계획 지문·파일별 결과·최종 결과를 제한 폴더에 보관한다. 기존 68개 업무 테이블의 데이터 지문을 비교하고, 감사 테이블은 원래 행의 지문 유지와 의도한 새 감사 행 수를 별도로 확인한다.
- 로컬에서 원본을 디코딩하는 것은 서버·브라우저의 실제 재생/탐색 E2E, 모든 코덱 지원 또는 악성 파일 검사를 대신하지 않는다. **이 DB는 리허설 전용이며 운영으로 밀어넣을 최종 DB가 아니다.** 운영용 backfill은 최종 스냅샷·분류·접근 차이·보존 hold를 검토한 뒤 별도 실행 경로로 준비한다.
