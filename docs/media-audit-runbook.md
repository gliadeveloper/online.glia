# 코스·코칭 미디어 읽기 전용 대조 도구

구현 기준: 2026-10-07. 정책은 [개발 정책 1](./media-r2-folder-structure.md)과 [개발 정책 2](./media-asset-database-design.md)를 따른다.

이 도구는 **기존 DB 본문·자산 등록·사용처와 R2 객체 목록의 차이를 조사**한다. 파일 등록, 소유자 확정, DB 수정, 파일 복사·이동·삭제, 수명 규칙 변경을 수행하지 않는다. 보고서의 모든 `deletionEligible`과 `deletionAuthorized`는 항상 false다. 결과를 삭제 worker의 입력으로 사용하지 않는다.

## 1. 실행 모드

먼저 가상 데이터로 동작을 확인할 수 있다. 이 예제는 운영 데이터가 아니며 DB/R2에 연결하지 않는다. 출력 경로는 실행할 때마다 새 이름을 사용한다.

```sh
npm run media:audit -- \
  --config scripts/fixtures/media-audit/config.json \
  --snapshot scripts/fixtures/media-audit/snapshot.json \
  --inventory scripts/fixtures/media-audit/inventory.json \
  --out .media-audit/example
```

실제 읽기는 `--live`를 명시하고 별도로 지정한 환경 파일 또는 환경변수를 사용한다. 저장소의 `.env`, `.env.local`이나 앱 Prisma singleton은 불러오지 않는다. `DATABASE_URL`과 앱의 R2 변수로 자동 대체하지 않는다.

```sh
npm run media:audit -- \
  --live \
  --config /secure/media-audit-config.json \
  --env-file /secure/media-audit.env \
  --out .media-audit/run-20261007
```

환경 파일의 변수 이름:

```dotenv
MEDIA_AUDIT_DATABASE_URL=postgresql://read_only_user:REPLACE@HOST:5432/DB
MEDIA_AUDIT_R2_BUCKET=REPLACE
MEDIA_AUDIT_R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
MEDIA_AUDIT_R2_ACCESS_KEY_ID=REPLACE
MEDIA_AUDIT_R2_SECRET_ACCESS_KEY=REPLACE
```

DB는 조사 대상 테이블을 SELECT할 수 있는 계정, R2는 해당 버킷 객체 목록을 읽을 수 있는 권한으로 실행한다. DB의 행 수준 보안(RLS)이나 제한된 계정 때문에 일부 행이 보이지 않을 수 있다면 전체 대조로 해석하지 않는다. 도구도 대상 테이블에 RLS가 설정되어 있으면 별도 검토 항목을 남긴다. TLS 연결 설정은 해당 DB 운영 설정을 따른다.

R2에는 `ListObjectsV2`만 요청한다. 전체 버킷을 마지막 페이지까지 읽으며 prefix로 범위를 잘라 미참조로 판단하지 않는다. 파일 본문 다운로드·HEAD·PUT·DELETE 요청은 없다. SDK 오류나 권한 실패, 반복/누락된 다음 페이지 토큰, 중복 객체 관측은 실패 처리한다. 객체 key의 URL 인코딩은 응답의 EncodingType에 따라 정확히 한 번 해석한다. API 근거: [Cloudflare R2 호환표](https://developers.cloudflare.com/r2/api/s3/api/), [ListObjectsV2 요청·응답](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html).

## 2. 주소 설정과 별칭

```json
{
  "appOrigin": "https://online.glia.kr",
  "publicBaseUrl": "https://YOUR_PUBLIC_MEDIA_HOST",
  "proxyOrigins": ["https://PREVIOUS_APP_HOST"],
  "publicBaseUrls": ["https://PREVIOUS_MEDIA_HOST/path"],
  "keyAliases": [
    {
      "urlKey": "courses/known-logical-key/example.mp3",
      "bucket": "YOUR_BUCKET",
      "objectKey": "exact-existing-object-key/example.mp3"
    }
  ]
}
```

`appOrigin`만 필수다. 사용하지 않는 항목과 예시 별칭은 삭제한다. 호스트는 실제 확인된 값만 지정한다. URL key와 실제 objectKey가 다르면 DB에 등록된 매핑을 먼저 사용하고, 추가 별칭은 실제 파일 조사로 확인한 쌍만 넣는다. 파일명이나 유사한 경로를 검색해서 자동으로 연결하지 않는다. 같은 URL key의 중복 별칭이나 기존 DB 매핑과 충돌하는 별칭은 실행을 거절한다.

확인되지 않은 프록시 호스트와 `*.r2.dev` 주소는 `UNKNOWN_MEDIA_ORIGIN`으로 남긴다. 일반 외부 링크를 우리 버킷 자산으로 간주하지 않는다. 등록된 실제 key와 같은 이름을 가진 URL이라도 등록 URL key가 다르면 `UNREGISTERED_URL_ALIAS`로 알린다. 별칭 설정은 **조사 도구 전용**이며 앱 재생·저장 권한을 자동으로 바꾸지 않는다.

물리 key가 다른 파일의 조사 범위와 회차/레슨 문맥도 등록된 `urlKey`와 명시적 별칭을 함께 사용한다. 여러 논리 경로가 같은 객체를 가리키면 편집자 후보를 모두 보존하되 소유자는 확정하지 않는다. 매핑 없이 버킷명이나 임의 prefix를 자동 제거하지 않으며, 다른 버킷의 별칭을 가져오지 않는다. 운영에서 확인된 버킷명 prefix 사례는 [2026-10-09 실행 기록](./production-migration-rehearsal-2026-10-09.md)에 있다.

DB 스냅샷에는 사용한 설정의 지문이 포함된다. 다른 설정으로 스냅샷을 재해석하면 원문에서 놓친 URL을 복구할 수 없으므로 거절한다. 주소 설정을 바꿨다면 DB를 다시 읽어 새 스냅샷을 만든다.

## 3. 조사 범위와 일관성

DB는 전용 연결에서 `REPEATABLE READ READ ONLY` 트랜잭션으로 읽고 마지막에 ROLLBACK한다. 행 ID를 기준으로 페이지를 나눠 읽어 조회 중 편집이 일어나도 같은 DB 시점을 유지한다. R2 목록 수집은 DB 트랜잭션 밖에서 먼저 수행한다. 따라서 **DB와 R2가 같은 순간의 원자적 스냅샷은 아니다.** 두 관측 구간을 보고서에 기록하고 이관 전 변경분 재대조가 필요하다.

새 미디어 테이블이 전혀 없으면 `ABSENT`, 다섯 테이블이 있으면 `PRESENT`, 일부만 있으면 `PARTIAL`로 표시한다. PARTIAL을 정상 이관 상태로 취급하지 않는다. 기존 마이그레이션 이전 DB에서도 본문·수업자료 등의 참조 조사는 가능하다.

확인하는 출처:

- 코스 Content의 body/url/metadata, 코칭 회차의 bodyMarkdown/bodyMetadata. bodyVersion을 기록해 후속 이관 시 오래된 본문인지 비교할 수 있다.
- 범위 밖 소비자: 수업자료 objectKey, 코스·모듈·레슨 설명, 상품 설명·BlockNote metadata, 코칭 상품 설명·템플릿·요약, 커뮤니티 글·댓글, Q&A, 레슨 노트, 코칭 메시지·로그, 프로필·가입 초안·외부 계정 아바타, 조직·카테고리 설명, 퀴즈·과제·제출물·후기·폼의 관련 텍스트/JSON 필드.
- 이미 등록된 MediaAsset·MediaFile·MediaUsage. 원본과 파생본 모두 확인한다. 파일의 등록된 bucket/objectKey와 URL key를 구분한다.

필드 목록은 [database.ts의 SOURCE_FIELDS](../scripts/media-audit/database.ts)에 명시되어 있다. 비밀번호·인증 토큰·이메일·본문 원문을 스냅샷으로 내보내지 않는다. 감사 로그·멱등 응답·인증 세션·migration 이력은 콘텐츠 사용처로 읽지 않는다. 새 미디어 관련 이름의 필드가 발견되면 미조사 항목으로 보고한다. 이름 기반 검사는 모든 새 소비자를 찾는 증명이 아니므로 manifest 검토와 코드 검색을 함께 수행해야 한다. 소스 코드·외부 서비스·백업의 참조는 이번 DB 대조 범위에 포함되지 않는다.

기본 상한은 DB 조회 20만 행/128MiB(직렬화된 조회 행 기준), R2 20만 객체다. 각 수집 단계는 페이지 사이에서 120초 경과 여부를 검사하고, 개별 DB 쿼리는 30초 제한을 둔다. 한도를 넘으면 샘플 결과를 전체 결과로 저장하지 않고 실패한다. 더 큰 환경은 작업 분할·스트리밍 설계를 검토한 뒤 한도를 변경한다.

## 4. 결과 해석

`report.json`의 주요 분류:

- `LIBRARY_STORED`: 현재 보관함 자산이며 조사 범위에서 본문 참조가 관측되지 않음. 정상 보관 상태이며 삭제 후보라는 뜻이 아니다.
- `REFERENCED`: 확인한 본문이나 다른 소비자에서 사용함.
- `POSSIBLY_REFERENCED`: 사용자 정의 metadata·코드 예제·문자열 등에서 경로를 발견함. 보존 검토 근거이며 MediaUsage를 자동 생성할 근거는 아니다.
- `NO_REFERENCE_OBSERVED`: 조사 범위에서 참조를 관측하지 못함. 보관 의사와 삭제 자격은 별도 확인해야 한다.
- `STAGING_OBSERVED`, `OUT_OF_SCOPE`: 임시 경로 또는 이번 자산 정리 범위 밖 경로. 이 도구에서 지우지 않는다.

검토 항목:

- `UNREGISTERED_REFERENCE`: 본문에서 쓰지만 자산 파일로 등록되지 않음.
- `USAGE_MISSING`, `USAGE_COUNT_MISMATCH`, `USAGE_NOT_IN_PARSED_BODY`: 파싱한 본문과 MediaUsage의 차이. 파싱 실패·별칭·미통합 소비자 여부를 먼저 확인하며 사용처를 자동으로 추가하거나 제거하지 않는다.
- `OUTSIDE_CONTENT_CONSUMER`, `HOLD_RECOMMENDED`: 상품·Q&A·수업자료 등에서도 사용. 이관 시 자산 retentionHold 검토 대상이며 도구 자체가 hold를 설정하지 않는다.
- `OWNER_UNCONFIRMED`: 미등록 또는 UNCLASSIFIED 자료. 현재 코치·강사는 `editorCandidateIds`로만 제시한다. 현재 편집자가 업로더나 실제 소유자였다고 판단하지 않는다.
- `CONTEXT_NOT_FOUND`: key에 적힌 회차 또는 코스/레슨 조합이 현재 DB에 없음. 파일 삭제 승인이 아니다.
- `REFERENCED_OBJECT_NOT_LISTED`, `READY_OBJECT_NOT_LISTED`: 완전히 수집된 해당 버킷 목록에서 발견되지 않음. DB/R2 관측 시각 차이와 별칭을 재확인해야 한다. 불완전한 목록에서는 이 판단을 내리지 않는다. 다른 버킷은 `BUCKET_NOT_SCANNED`다.
- `SIZE_MISMATCH`, `REFERENCE_FILE_NOT_READY`, `REFERENCE_ASSET_NOT_READY`, `OBJECT_REMAINS_AFTER_RETIREMENT`: 등록 상태와 현재 관측의 불일치. 목록의 크기·ETag는 실제 내용·해시·재생 가능성 검증을 대신하지 않는다.
- `BODY_PARSE_FAILED`, `SUPPLEMENTAL_SCAN_INCOMPLETE`, `SOURCE_SCHEMA_MISSING`, `SOURCE_COVERAGE_REVIEW_REQUIRED`, `RLS_VISIBILITY_REVIEW_REQUIRED`: 조사 범위·정확성 검토가 필요한 상태. 정상 대조 완료로 해석하지 않는다.

BlockNote와 호환 마크다운이 같은 자료를 가리키면 자산별 출현 횟수의 최댓값을 쓴다. 서로 다른 자료를 가리키면 양쪽 참조를 보존한다. 문자열 보조 조사는 오탐을 허용하는 보수적 점검이므로 실제 사용처와 구분한다.

## 5. 출력과 재실행

새 디렉터리에 다음 파일을 만든다.

- `summary.md`: 검토 항목별 건수. 파일명·본문 원문 없이 요약한다.
- `report.json`: 객체별 관측·사용처 불일치·검토 항목·입력 지문.
- `snapshot.json`: 본문 원문 없이 추출한 참조, 내부 ID, 본문 버전, DB 자산/사용처와 조사 범위.
- `inventory.json`: 실제 bucket 객체 key·크기·ETag·수정 시각 관측.
- `manifest.json`: 위 보고서 파일 작성이 끝난 뒤 마지막으로 생성하는 완료 표지. 삭제 허가나 모든 조사 범위가 완전하다는 표지가 아니다.

실패 시 가능하면 `FAILED.json`에 실패 단계와 비밀정보 없는 오류 코드를 남기고 종료 코드 1을 반환한다. 성공은 종료 코드 0이며, 검토 항목 0건을 보장하지 않는다. 부분 파일이나 완료 표지가 없는 디렉터리를 완성된 보고서로 사용하지 않는다. 이전 결과는 덮어쓰지 않는다.

디렉터리는 0700, 파일은 0600으로 생성하고 `.media-audit/`는 Git과 Docker context에서 제외했다. 실제 운영 데이터 산출물은 저장소 밖의 접근 제한 폴더에 보관한다. 출력에는 내부 식별자와 원본 객체 경로가 있으므로 개발·운영 검토용으로 제한한다. 터미널에는 요약 건수만 출력한다. 인증정보·서명 URL·본문을 오류 로그에 출력하지 않는다.

같은 config/snapshot/inventory를 오프라인 모드로 다시 읽으면 같은 대조 결과를 재현한다. `snapshotSha256`, `inventorySha256`, `configSha256`으로 입력 내용이 바뀌었는지 구분한다. 파일 내용과 소유자를 확인한 뒤에만 다음 등록·backfill 단계로 진행한다.

## 6. 검증 범위

```sh
npm run test:media-db
```

임시 PostgreSQL에서 migration 전/후 읽기, 부분 스키마, 읽기 전용 강제, 조회 중 편집, 페이지 처리, RLS·미조사 필드 감지와 기존 저장/삭제 API 회귀를 검사한다. R2는 합성 페이지와 실제 AWS SDK의 XML 응답 처리까지 검사하며 실제 R2 계정에는 연결하지 않는다. 오프라인 CLI의 보고서 출력·파일 권한·덮어쓰기 거절도 검증한다.

위 자동 검사는 운영 DB/R2에 접속하지 않는다. 실제 운영 데이터 조사와 R2 권한·목록 응답 검증은 별도 절차이며, 2026-10-09에 수행한 운영 읽기·로컬 복원본 대조와 별도의 HEAD 검증은 [실행 기록](./production-migration-rehearsal-2026-10-09.md)을 따른다. 이 CLI 자체에는 HEAD나 쓰기 기능을 추가하지 않았다.
