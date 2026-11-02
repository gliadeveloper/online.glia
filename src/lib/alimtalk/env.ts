export const SENS_ALIMTALK_ORIGIN = "https://sens.apigw.ntruss.com";

/** 알림톡 메시지 발송. serviceId 는 Biz Message 서비스 ID다. */
export const SENS_ALIMTALK_SEND_PATH = "/alimtalk/v2/services";

export type SensAlimtalkConfig = {
  accessKey: string;
  secretKey: string;
  serviceId: string;
  channelId: string;
  apiOrigin: typeof SENS_ALIMTALK_ORIGIN;
};

export class AlimtalkError extends Error {
  constructor(
    message: string,
    readonly code:
      | "SENS_ALIMTALK_CONFIG"
      | "SENS_ALIMTALK_INVALID"
      | "SENS_ALIMTALK_REJECTED"
      | "SENS_ALIMTALK_UNAVAILABLE",
    readonly resultCode?: string,
  ) {
    super(message);
    this.name = "AlimtalkError";
  }
}

const ACCESS_KEY = /^ncp_iam_[A-Za-z0-9]{10,40}$/;
const SERVICE_ID = /^ncp:kkobizmsg:kr:\d{6,20}:[a-z0-9][a-z0-9_-]{0,22}$/;
const CHANNEL_ID = /^@[^\s/?#]{1,30}$/;

function read(env: NodeJS.ProcessEnv, name: string) {
  return env[name]?.trim() ?? "";
}

/**
 * 네 값이 모두 비어 있으면 알림톡을 쓰지 않는 상태로 본다.
 * 일부만 있으면 설정 오류다. 반환 객체에는 시크릿이 있으므로 로그에 남기지 않는다.
 */
export function parseSensAlimtalkEnv(env: NodeJS.ProcessEnv): SensAlimtalkConfig | null {
  const accessKey = read(env, "NCP_ACCESS_KEY");
  const secretKey = read(env, "NCP_SECRET_KEY");
  const serviceId = read(env, "NCP_SENS_BIZ_SERVICE_ID");
  const channelId = read(env, "NCP_KAKAO_CHANNEL_ID");

  if (!accessKey && !secretKey && !serviceId && !channelId) return null;

  if (!accessKey || !secretKey || !serviceId || !channelId) {
    throw new AlimtalkError(
      "네이버 클라우드 Access Key, Secret Key, Biz Message 서비스 ID, 채널 ID를 함께 설정해 주세요.",
      "SENS_ALIMTALK_CONFIG",
    );
  }
  if (!ACCESS_KEY.test(accessKey)) {
    throw new AlimtalkError("네이버 클라우드 Access Key 형식을 확인해 주세요.", "SENS_ALIMTALK_CONFIG");
  }
  if (secretKey.length < 20 || secretKey.length > 80 || /\s/.test(secretKey)) {
    throw new AlimtalkError("네이버 클라우드 Secret Key 형식을 확인해 주세요.", "SENS_ALIMTALK_CONFIG");
  }
  if (!SERVICE_ID.test(serviceId)) {
    throw new AlimtalkError("Biz Message 서비스 ID 형식을 확인해 주세요.", "SENS_ALIMTALK_CONFIG");
  }
  if (!CHANNEL_ID.test(channelId)) {
    throw new AlimtalkError("카카오톡 채널 ID는 @로 시작해야 합니다.", "SENS_ALIMTALK_CONFIG");
  }

  return {
    accessKey,
    secretKey,
    serviceId,
    channelId,
    apiOrigin: SENS_ALIMTALK_ORIGIN,
  };
}
