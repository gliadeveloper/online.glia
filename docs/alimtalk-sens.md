# 네이버 클라우드 알림톡 발송 모듈

검수된 정보성 템플릿을 Simple & Easy Notification Service 알림톡 API로 접수하는 서버 모듈이다. 앱 안 알림(`NotificationEvent`)과는 별개다. 채널·템플릿 검수가 끝나기 전에는 환경 변수를 비워 둔다.

공식 명세: [AlimTalk Message](https://guide.ncloud-docs.com/docs/sens-atmessage), [메시지 발송](https://api.ncloud-docs.com/docs/sens-alimtalk-send), [발송 결과 조회](https://api.ncloud-docs.com/docs/sens-alimtalk-get), [시그니처 생성](https://api.ncloud-docs.com/docs/common-ncpapi). 콘솔에서는 이력을 조회하고, 발송은 API로만 한다.

## 발송 규약

접수 API는 하나다. 앱키와 발신키는 없다.

```
POST https://sens.apigw.ntruss.com/alimtalk/v2/services/{serviceId}/messages
Content-Type: application/json
x-ncp-apigw-timestamp: {밀리초}
x-ncp-iam-access-key: {Access Key}
x-ncp-apigw-signature-v2: {HMAC-SHA256 서명}
```

서명의 원문은 `POST /alimtalk/v2/services/{serviceId}/messages`, 줄바꿈, timestamp, 줄바꿈, Access Key다. Secret Key는 이 원문을 서명하는 데만 쓰고 헤더로 보내지 않는다. timestamp는 서명에 넣은 값과 같다.

| 값 | 규칙 |
| --- | --- |
| `serviceId` | Project의 Biz Message 서비스 ID. `ncp:kkobizmsg:kr:`로 시작한다 |
| `plusFriendId` | 카카오톡 채널 ID. `@글리아`처럼 `@`로 시작한다 |
| `templateCode` | 콘솔에 등록한 코드. 영문·숫자만, 최대 20자 |
| `messages` | 1–100건. `to`는 숫자만. `content`는 검수된 템플릿과 같은 완성 문장이고 1,000자 이내. `#{변수}`가 남아 있으면 보내지 않는다 |
| `title` | 강조표기형 템플릿의 강조 제목. 50자 이내 |
| `buttons` | 웹 링크는 `http://` 또는 `https://` 모바일·PC 주소가 둘 다 필요하다. 변수가 남은 주소, `localhost`, 도메인이 없는 주소, `%2F`처럼 인코딩된 경로는 카카오 링크 검증에서 실패하므로 보내기 전에 거절한다 |
| `reserveTime` | 없으면 즉시 발송. 있으면 한국 시간 `yyyy-MM-dd HH:mm`, 지금부터 10분 이후 |

`statusCode`가 `202`이면 접수다. 수신자 `requestStatusCode` `A000`은 요청 성공이다. 카카오톡 도착은 발송 결과 조회의 `messageStatusCode` `0000`이다. 콘솔의 수신상태와 같다.

## Next.js에서 이 모양인 이유

이 앱은 App Router다. 발송 모듈은 아래 세 규칙을 그대로 따른다.

1. **시크릿은 서버에만 있다.** `NEXT_PUBLIC_`이 아닌 환경 변수는 브라우저 번들에 들어가지 않는다. Secret Key에는 그 접두사를 붙이지 않는다. `.env`는 프로젝트 루트에만 둔다.
2. **시크릿을 읽는 곳은 서버 모듈뿐이다.** `import "server-only"`인 모듈에서 `process.env`를 읽는다. 클라이언트 컴포넌트가 이 모듈을 import하면 빌드가 실패한다.
3. **공개 Route Handler로 발송하지 않는다.** 전화번호와 템플릿 코드를 받는 공개 POST는 아무나 알림톡을 쏘는 입구가 된다. 결제가 끝난 서버 함수 안에서 `sendAlimtalk`을 호출한다.

발송 `fetch`는 `POST`이고 `cache: "no-store"`다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `src/lib/alimtalk/env.ts` | 환경 변수 검사. 시크릿을 로그로 남기지 않는다 |
| `src/lib/alimtalk/config.ts` | 서버에서만 `process.env`를 읽는다 |
| `src/lib/alimtalk/send.ts` | 서명, 발송 요청, 응답 확인 |

환경 변수는 네 개를 같이 둔다. 모두 비어 있으면 발송하지 않는다. 일부만 있으면 설정 오류다.

```
NCP_ACCESS_KEY=
NCP_SECRET_KEY=
NCP_SENS_BIZ_SERVICE_ID=
NCP_KAKAO_CHANNEL_ID=
```

Access Key와 Secret Key는 콘솔 **My Account > 계정 및 보안 관리 > 보안 관리 > 접근 관리**의 API 인증키다. 서비스 ID는 SENS **Project**의 Biz Message 행이다. 채널 ID는 템플릿의 채널 ID다.

## 호출

서버 함수에서만 부른다. 키가 없으면 건너뛴다. 접수 실패가 결제·발행 성공을 되돌리지 않게, 주문이나 회차 저장이 끝난 뒤에 호출하고 실패는 기록한다.

```ts
import { getSensAlimtalkConfig } from "@/lib/alimtalk/config";
import { sendAlimtalk } from "@/lib/alimtalk/send";

if (getSensAlimtalkConfig() && user.phoneNumber) {
  await sendAlimtalk({
    templateCode: "LIVEDAY",
    messages: [
      {
        phoneNumber: user.phoneNumber,
        content: renderedTemplate,
        buttons: [
          {
            type: "WL",
            name: "수업 입장하기",
            linkMobile: lessonUrl,
            linkPc: lessonUrl,
          },
        ],
      },
    ],
  });
}
```

`content`는 `#{name}`이 치환된 완성 문장이다. 버튼 문구가 템플릿과 다르면 발송이 거절된다.

## 연결된 발송

- `SIGNUPOK`: 이메일 가입과 카카오 온보딩이 끝난 뒤, 휴대폰 번호가 있을 때만.
- `FAQREPLY`: 강의 질문 답글이 달리고, 답글 작성자가 질문자와 다를 때.
- `LIVEDAY`, `LIVEHOUR`, `LIVE15MIN`: 코치가 LIVE 수업 시작 시각을 저장하면 예약한다. 이후 수강이 열리면 그 수강생만 추가 예약한다. 예약 시각이 현재부터 10분 안이면 그 알림은 건너뛴다.

## 아직 연결하지 않은 것

- 결제 완료 알림. `PAYMENTOK` 템플릿이 검수되지 않았다.
- 발송 결과 조회.
- 템플릿 등록 API. 문구 검수는 SENS 콘솔에서 한다.
