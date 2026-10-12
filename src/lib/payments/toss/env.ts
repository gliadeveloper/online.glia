export const TOSS_API_ORIGIN = "https://api.tosspayments.com";

/** Test environment allows 100 requests per minute for each API. */
export const TOSS_TEST_API_RATE_LIMIT_PER_MINUTE = 100;

export type TossPaymentsEnvironment = "test" | "live";
export type TossKeyKind = "widget" | "api";

export type TossPaymentsConfig = {
  environment: TossPaymentsEnvironment;
  keyKind: TossKeyKind;
  clientKey: string;
  secretKey: string;
  apiOrigin: typeof TOSS_API_ORIGIN;
};

export class TossPaymentsConfigError extends Error {
  constructor(
    message: string,
    readonly code: "TOSS_PAYMENTS_CONFIG_INVALID" | "TOSS_PAYMENTS_TEST_CODE_REJECTED" = "TOSS_PAYMENTS_CONFIG_INVALID",
  ) {
    super(message);
    this.name = "TossPaymentsConfigError";
  }
}

const WIDGET_CLIENT = /^(test|live)_gck_([A-Za-z0-9_]+)$/;
const API_CLIENT = /^(test|live)_ck_([A-Za-z0-9_]+)$/;
const WIDGET_SECRET = /^(test|live)_gsk_([A-Za-z0-9_]+)$/;
const API_SECRET = /^(test|live)_sk_([A-Za-z0-9_]+)$/;

function classifyKey(key: string, role: "client" | "secret") {
  const widget = role === "client" ? WIDGET_CLIENT : WIDGET_SECRET;
  const api = role === "client" ? API_CLIENT : API_SECRET;
  const widgetMatch = widget.exec(key);
  if (widgetMatch?.[2]) {
    return { environment: widgetMatch[1] as TossPaymentsEnvironment, keyKind: "widget" as const };
  }
  const apiMatch = api.exec(key);
  if (apiMatch?.[2]) {
    return { environment: apiMatch[1] as TossPaymentsEnvironment, keyKind: "api" as const };
  }
  return null;
}

function read(env: NodeJS.ProcessEnv, name: string) {
  return env[name]?.trim() ?? "";
}

/**
 * Returns null when Toss is not configured.
 * Throws when any of the three variables is set but the set is incomplete or inconsistent.
 * Never log the returned object: it contains the secret key.
 */
export function parseTossPaymentsEnv(env: NodeJS.ProcessEnv): TossPaymentsConfig | null {
  const environment = read(env, "TOSS_PAYMENTS_ENV");
  const clientKey = read(env, "TOSS_PAYMENTS_CLIENT_KEY");
  const secretKey = read(env, "TOSS_PAYMENTS_SECRET_KEY");

  if (!environment && !clientKey && !secretKey) {
    return null;
  }

  if (environment !== "test" && environment !== "live") {
    throw new TossPaymentsConfigError("TOSS_PAYMENTS_ENV는 test 또는 live여야 합니다.");
  }
  if (!clientKey || !secretKey) {
    throw new TossPaymentsConfigError("토스페이먼츠 클라이언트 키와 시크릿 키를 함께 설정해 주세요.");
  }

  const client = classifyKey(clientKey, "client");
  const secret = classifyKey(secretKey, "secret");
  if (!client || !secret) {
    throw new TossPaymentsConfigError("토스페이먼츠 키 형식을 확인해 주세요.");
  }
  if (client.environment !== environment || secret.environment !== environment) {
    throw new TossPaymentsConfigError("토스페이먼츠 키가 설정된 환경과 일치하지 않습니다.");
  }
  if (client.keyKind !== secret.keyKind) {
    throw new TossPaymentsConfigError("클라이언트 키와 시크릿 키는 같은 연동 방식이어야 합니다.");
  }

  return {
    environment,
    keyKind: client.keyKind,
    clientKey,
    secretKey,
    apiOrigin: TOSS_API_ORIGIN,
  };
}

export function tossAuthorizationHeader(secretKey: string) {
  return `Basic ${Buffer.from(`${secretKey}:`, "utf8").toString("base64")}`;
}

/** Live keys ignore this header, so the server refuses to send it outside the test secret key. */
export function tossTestCodeHeader(config: TossPaymentsConfig, testCode: string | undefined) {
  const code = testCode?.trim() ?? "";
  if (!code) return {};
  if (!/^[A-Z0-9_]{1,80}$/.test(code)) {
    throw new TossPaymentsConfigError(
      "테스트 에러 코드 형식이 올바르지 않습니다.",
      "TOSS_PAYMENTS_TEST_CODE_REJECTED",
    );
  }
  if (config.environment !== "test" || !config.secretKey.startsWith("test_")) {
    throw new TossPaymentsConfigError(
      "테스트 에러 재현은 테스트 시크릿 키에서만 사용할 수 있습니다.",
      "TOSS_PAYMENTS_TEST_CODE_REJECTED",
    );
  }
  return { "TossPayments-Test-Code": code };
}

export function tossApiUrl(path: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("://")) {
    throw new TossPaymentsConfigError("토스페이먼츠 API 경로가 올바르지 않습니다.");
  }
  const url = new URL(path, TOSS_API_ORIGIN);
  if (url.origin !== TOSS_API_ORIGIN || url.username || url.password) {
    throw new TossPaymentsConfigError("토스페이먼츠 API 주소가 올바르지 않습니다.");
  }
  return url;
}
