# 회원탈퇴 DB 구성안

- 작성: 2026-11-02
- 수정: 2026-11-02. 클래스101, 인프런, 패스트캠퍼스 탈퇴 방식과 전자상거래법 시행령 제6조를 반영
- 상태: 기획. 스키마와 탈퇴 API는 아직 없다.
- 기준 스키마: `prisma/schema.prisma`의 `User`와 그 연결

회원 행은 지우지 않는다. 신청 즉시 로그인을 끊고 30일간 복구할 수 있게 둔 뒤, 그 다음에 연락처를 지운다. 주문·결제 당사자 정보는 회원 행이 아니라 별도 보관 행에만 남긴다.

## 1. 비교한 서비스

글리아와 같이 유료 강의를 계정에 묶어 제공하는 곳을 봤다. 공개된 고객센터와 개인정보 처리방침 기준이다.

| | 클래스101 | 인프런 | 패스트캠퍼스 | 글리아 구성 |
|---|---|---|---|---|
| 상품 | 클래스, 구독, 코칭권, 키트 | 강의, 멘토링 | 유료 강의 | 강의, 라이브, 코칭, 체크인 |
| 처리 유예 | 신청 15일 뒤 삭제. 그 전에는 취소 불가라고 안내 | 탈퇴 접수 후 7일간 개인정보 보존 | 탈퇴 후 30일간 계정·수강 복구 | 30일. 패스트캠퍼스와 같이 수강 복구를 허용 |
| 유예 뒤 수강 | 계정에 묶인 열람권은 사라짐. 재가입해도 복구 안 됨 | 해지 즉시 정보 파기. 게시물은 자동 삭제 안 됨 | 30일 후 수강·쿠폰 삭제. 재가입해도 복구 안 됨 | 30일 후 수강은 `DROPPED`, 코칭권은 `REVOKED`. 재가입 계정에 합치지 않음 |
| 소셜 재가입 | 카카오·네이버는 삭제 후에도 같은 계정으로 재가입 불가 | 재가입까지 일정 기간을 제한할 수 있음 | 처리방침은 소셜 정보를 탈퇴 후 30일까지 보관 | 유예 중에는 같은 이메일·카카오 재가입 불가. 유예가 끝나면 허용. 클래스101식 영구 금지는 하지 않음 |
| 부정 이용 | 탈퇴 전 구독 해지, 배송·교환·환불 중이면 탈퇴 불가 | 부정이용 기록을 1년 보존 | 탈퇴 후 30일간 부정이용 기록 보관 | 진행 중 환불이 있으면 신청 거절. 부정이용이 있을 때만 식별자 해시를 1년 보관 |
| 게시물 | 탈퇴 후에는 수정·삭제 불가. 미리 지우라고 안내 | 본인 게시물은 탈퇴만으로 삭제되지 않음 | 공개 범위가 적음 | 글은 남기고 표시만 `탈퇴한 회원`. 신청 전에 직접 삭제 |
| 법정 기록 | 가입 정보는 탈퇴 후 15일, 결제·공급 기록은 5년. 법정 기록은 분리 보관 | 계약·결제 5년, 분쟁 3년, 접속 3개월. 목적에 필요한 최소 정보만 | 서비스 정보는 30일 후 파기. 법령 기록은 다른 데이터베이스로 분리 | `UserWithdrawal`만 법정 연락처를 가진다. 마이페이지·알림·로그인은 이 테이블을 읽지 않음 |
| 기간의 기산 | 결제 기록 5년 | 거래가 있은 날부터 5년. 탈퇴일부터가 아님 | 결제 기록 5년, 분쟁 기록 3년 | 각 주문·결제의 발생일부터 5년. 탈퇴일 + 5년이 아님 |

클래스101 안내: [계정 삭제](https://help.class101.tv/classmate/how-to-withdraw), [개인정보 처리방침](https://creator.class101.net/docs/terms/privacy). 인프런: [개인정보 처리방침](https://www.inflearn.com/policy/privacy), 이용약관 제22조. 패스트캠퍼스: [탈퇴 후 삭제 시점](https://support.fastcampus.co.kr/hc/ko/articles/7549669346841), [수강 복구](https://support.fastcampus.co.kr/hc/ko/articles/7549787386649). 전자상거래법 시행령 제6조는 계약·청약철회 5년, 대금결제·공급 5년, 불만·분쟁 3년, 표시·광고 6개월이고, 동의를 철회한 소비자의 기록은 나머지 회원 정보와 따로 보존한다.

이전 안의 “신청 즉시 익명화, 주문이 있으면 탈퇴일부터 5년”은 세 서비스와 어긋난다. 유예가 없고, 이미 지난 거래까지 탈퇴일로부터 다시 5년을 센다.

## 2. 가입 때 생기는 데이터

이메일 가입이 끝나면 `SignupDraft`는 지워지고 `User` 한 행이 남는다.

| 컬럼 | 이메일 가입 | 카카오 가입 |
|---|---|---|
| `email` | 인증한 주소. 고유 | 카카오 이메일 또는 자리표시 주소. 고유 |
| `password` | 해시 | 없음 |
| `name` | 성명 | 없음. 결제 전에 받을 수 있음 |
| `phoneNumber` | 휴대폰 번호 | 동의하고 번호가 비어 있을 때만 |
| `nickname` | 없음 | 카카오 닉네임 |
| `userId` | 자동 공개 식별자. 고유 | 온보딩 때 부여 |
| `emailKind` | `VERIFIED` | `VERIFIED` 또는 `PLACEHOLDER` |
| `Identity` | 없음 | 카카오 `providerAccountId`, 토큰 |

`User.status`는 `ACTIVE` / `SUSPENDED` / `DELETED`다. 로그인과 세션은 `ACTIVE`만 통과한다. 유예 상태를 위해 `WITHDRAWAL_PENDING`을 추가한다. `ACTIVE`가 아니면 이미 로그인이 막히므로 유예 중 이용도 멈춘다.

## 3. 행을 지우면 안 되는 이유

| 연결 | `onDelete` | 탈퇴 시 처리 |
|---|---|---|
| `Order`, `ShopCouponIssue` | Restrict | 회원 행 삭제 불가. 익명 회원에 그대로 둔다 |
| `Course.instructor`, `LiveSession.coach`, `CoachingSession.coach`, `MediaAsset.owner`, `CoachCheckInAccess.coach` | Restrict | 코치·관리자 탈퇴는 이 연결을 먼저 넘긴 뒤에만 가능하다 |
| `Enrollment`, `CoachingEntitlement`, `CoachingSession`(수강생), `FormSubmission`, `Post`, `Discussion` | Cascade | 회원 행을 지우면 수강·코칭 본문·체크인·글이 같이 삭제된다 |
| `Profile`, `Identity`, `AuthSession`, `UserConsent` | Cascade | 익명화 시점에 자격 정보만 비운다 |
| `AuditLog.actor` | SetNull | 행위 로그만 남고 계정 연결은 끊긴다 |

주문에는 구매자 이름·이메일·휴대폰 컬럼이 없다. 회원 행의 연락처를 비우기 전에 법정 보관분만을 `UserWithdrawal`로 복사한다.

## 4. 두 단계

### 신청 즉시, 30일 유예

패스트캠퍼스가 수강 복구에 주는 30일을 따른다. 클래스101의 15일, 인프런의 7일보다 긴 이유는 유료 수강과 코칭 회차를 고객센터 없이 본인이 되돌릴 수 있게 하기 위해서다.

1. `User.status = WITHDRAWAL_PENDING`.
2. `UserWithdrawal`을 만든다. `withdrawnAt`은 신청 시각, `restoreUntil`은 신청 시각 + 30일. 연락처 컬럼은 아직 비운다. 회원 행에 그대로 있다.
3. 세션을 전부 취소하고 알림톡 예약을 취소한다.
4. 수강, 코칭권, 체크인, 글은 건드리지 않는다. 복구가 원상복구가 되게 한다.
5. 진행 중인 환불이나 결제 대기 주문이 있으면 신청을 거절한다. 클래스101이 배송·교환·환불 중에 탈퇴를 막는 것과 같다.
6. 유예 중에는 같은 이메일·카카오로 새 가입을 받지 않는다. 기존 행이 그 고유 값을 아직 갖고 있기 때문이다.

30일 안에 본인 확인이 되면 `status`를 `ACTIVE`로 되돌리고 `UserWithdrawal`을 지운다. 세션은 새로 로그인하게 두고, 라이브 알림은 수업 시각이 남아 있으면 다시 예약한다.

### 30일 뒤 익명화

배치가 `restoreUntil`이 지난 `WITHDRAWAL_PENDING`을 처리한다.

1. `status = DELETED`.
2. 주문이 있으면 성명·이메일·휴대폰을 `UserWithdrawal`에 복사한다.
3. 회원 행의 이메일, 비밀번호, 성명, 휴대폰, 공개 식별자, 프로필, 카카오 `Identity`를 비우거나 지운다.
4. 수강은 `DROPPED`, 코칭권은 `REVOKED`. 체크인 답변·강의 메모·북마크·알림 수신 행은 삭제한다.
5. 글과 주문 행은 남긴다. 닉네임은 `탈퇴한 회원`이다.

복구 기한이 지난 수강과 쿠폰은 재가입해도 돌아오지 않는다. 패스트캠퍼스, 클래스101과 같다.

## 5. 보관 행

```prisma
model UserWithdrawal {
  id          String    @id @default(cuid())
  userId      String    @unique
  withdrawnAt DateTime
  restoreUntil DateTime
  finalizedAt DateTime?
  reason      String?
  /// 익명화 시에만 채운다. 주문·결제가 있을 때. 로그인·알림·마이페이지는 읽지 않는다.
  legalName   String?
  email       String?
  phoneNumber String?
  /// 부정이용 계정만. 이메일 또는 카카오 식별자의 해시. 재가입 거부에 쓴다.
  abuseKeyHash String?
  abuseKeyExpiresAt DateTime?
  /// 주문·결제의 발생일 + 5년 중 가장 늦은 시각. 거래가 없으면 finalizedAt.
  purgeAfter  DateTime
  purgedAt    DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@index([restoreUntil])
  @@index([purgeAfter])
  @@map("user_withdrawals")
}
```

`purgeAfter`는 탈퇴일이 아니라 거래일이다. 결제가 2024-01-01이면 보관 만료는 2029-01-01이다. 그 전에 탈퇴해도 만료가 탈퇴일로부터 다시 5년이 되지 않는다. 환불 기록도 결제·계약 기록으로 보아 같은 5년을 쓴다. 분쟁 처리 기록을 따로 모으기 시작하면 그 기록만 3년이다. 거래가 없으면 연락처를 복사하지 않고 `purgeAfter`는 익명화 시각이다.

만료 배치는 연락처와 `abuseKeyHash`만 지운다. 회원 행과 주문 금액·상태는 남긴다.

전자상거래법 시행령이 말하는 분리 보관은 이 테이블로 만족한다. 별도 데이터베이스 인스턴스까지 두지 않는다. 패스트캠퍼스 문언은 “다른 데이터베이스로 옮기거나 보관장소를 달리”이므로, 앱 조회 경로에서 빼는 것으로 같은 목적을 달성한다.

## 6. 익명화 내용

| 대상 | 처리 |
|---|---|
| `User.email` | `withdrawn_{user.id}@withdrawn.local` |
| `User.emailKind` | `PLACEHOLDER` |
| `User.password`, `name`, `phoneNumber`, `userId` | null |
| `User.nickname` | `탈퇴한 회원` |
| `User.status` | `DELETED` |
| `Profile` | 아바타, 소개, 링크 null |
| `Identity` | 삭제. 유예가 끝난 뒤 카카오 재가입 허용 |
| `Enrollment` | `DROPPED`. 진도 행은 유지 |
| `CoachingEntitlement` | `REVOKED` |
| `CoachingSession` | 유지. 코치가 쓴 본문은 고치지 않음. 본문에 이름이 남을 수 있음 |
| `Post`, `Discussion`, `Review`와 댓글 | 유지. 클래스101·인프런처럼 탈퇴만으로 글을 지우지 않음 |
| `UserConsent`, `Order`, `Payment`, `Refund`, `ShopCouponIssue` | 유지 |
| `FormSubmission`, `LessonNote`, `LessonBookmark` | 삭제 |
| `CoachCheckInAccess` 중 이 회원이 연 것 | 삭제 |
| `NotificationDelivery`, `AlimtalkReservation` | 삭제. 예약 취소는 익명화 직후 |
| `AuditLog` | `USER_WITHDRAWN`. metadata에 이메일·전화번호 없음 |

부정이용으로 이미 제재된 계정만 `abuseKeyHash`를 1년 둔다. 인프런의 1년 보존과 같고, 정상 탈퇴의 재가입은 막지 않는다. 클래스101처럼 카카오 재가입을 영구히 막지 않는다.

## 7. 하지 않는 것

- 신청 즉시 연락처 삭제. 세 서비스 모두 7일에서 30일의 유예가 있다.
- 탈퇴일로부터 일괄 5년. 기산점은 거래 발생일이다.
- 회원 행 물리 삭제.
- 재가입 계정에 이전 수강·주문을 붙이는 일.
- 코치·관리자 셀프 탈퇴.
- 체크인 답변을 결제 기록과 함께 5년 보관하는 일.
- 탈퇴 사유 필수화. 클래스101은 받지만 보관 목적의 개인정보가 아니므로 선택으로 둔다.
