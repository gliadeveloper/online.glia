import "server-only";

import { createHmac } from "node:crypto";

import { requireSensAlimtalkConfig } from "@/lib/alimtalk/config";
import { AlimtalkError, SENS_ALIMTALK_ORIGIN } from "@/lib/alimtalk/env";
import { normalizePhoneNumber } from "@/lib/member-contact";

const TEMPLATE_CODE = /^[A-Za-z0-9]{1,20}$/;
const RESERVE_TIME = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
const BUTTON_TYPE = new Set(["DS", "WL", "AL", "BK", "MD", "AC"]);
const FAILOVER_TYPE = new Set(["SMS", "LMS"]);
const TEN_MINUTES_MS = 10 * 60 * 1000;

export type AlimtalkButton = {
  type: "DS" | "WL" | "AL" | "BK" | "MD" | "AC";
  name: string;
  linkMobile?: string;
  linkPc?: string;
  schemeIos?: string;
  schemeAndroid?: string;
};

export type AlimtalkFailover = {
  type?: "SMS" | "LMS";
  from?: string;
  subject?: string;
  content?: string;
};

export type AlimtalkMessage = {
  phoneNumber: string;
  /** 검수된 템플릿과 같은 완성 문장. SENS는 #{변수}를 대신 넣지 않는다. */
  content: string;
  /** 강조표기형 템플릿의 강조 제목. */
  title?: string;
  buttons?: AlimtalkButton[];
  useSmsFailover?: boolean;
  failover?: AlimtalkFailover;
};

export type SendAlimtalkInput = {
  templateCode: string;
  messages: AlimtalkMessage[];
  /** 한국 시간 yyyy-MM-dd HH:mm. 지금부터 10분 이내는 거절된다. */
  reserveTime?: string;
  signal?: AbortSignal;
};

export type AlimtalkSendResult = {
  requestId: string;
  requestTime: string | null;
  statusCode: string;
  statusName: string;
  messages: Array<{
    messageId: string | null;
    to: string | null;
    requestStatusCode: string | null;
    requestStatusName: string | null;
    requestStatusDesc: string | null;
  }>;
};

type SensSendResponse = {
  requestId?: string;
  requestTime?: string;
  statusCode?: string;
  statusName?: string;
  messages?: Array<{
    messageId?: string;
    to?: string;
    requestStatusCode?: string;
    requestStatusName?: string;
    requestStatusDesc?: string;
  }>;
};

/**
 * 검수된 템플릿으로 알림톡을 접수한다.
 * statusCode 202 는 접수다. 카카오톡 도착은 이 응답에 없고, 수신자별 requestStatusCode A000 은 접수 성공이다.
 */
export async function sendAlimtalk(input: SendAlimtalkInput): Promise<AlimtalkSendResult> {
  const config = requireSensAlimtalkConfig();
  const path = sendPath(config.serviceId);
  const body = JSON.stringify(buildSendBody(config.channelId, input));
  const timestamp = Date.now().toString();
  const url = sendUrl(path);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-ncp-apigw-timestamp": timestamp,
        "x-ncp-iam-access-key": config.accessKey,
        "x-ncp-apigw-signature-v2": signRequest({
          method: "POST",
          path,
          timestamp,
          accessKey: config.accessKey,
          secretKey: config.secretKey,
        }),
      },
      body,
      redirect: "error",
      cache: "no-store",
      signal: input.signal ?? AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof AlimtalkError) throw error;
    throw new AlimtalkError("네이버 클라우드 알림톡 발송 요청에 실패했습니다.", "SENS_ALIMTALK_UNAVAILABLE");
  }

  const payload = await readSendResponse(response);
  if (payload.statusCode !== "202" || payload.statusName === "fail" || !payload.requestId) {
    throw new AlimtalkError("네이버 클라우드 알림톡 발송이 거절되었습니다.", "SENS_ALIMTALK_REJECTED", payload.statusCode);
  }

  return {
    requestId: payload.requestId,
    requestTime: payload.requestTime ?? null,
    statusCode: payload.statusCode,
    statusName: payload.statusName ?? "",
    messages: (payload.messages ?? []).map((message) => ({
      messageId: message.messageId ?? null,
      to: message.to ?? null,
      requestStatusCode: message.requestStatusCode ?? null,
      requestStatusName: message.requestStatusName ?? null,
      requestStatusDesc: message.requestStatusDesc ?? null,
    })),
  };
}

/** 시그니처 원문은 `METHOD path\ntimestamp\naccessKey` 다. Secret Key는 헤더로 나가지 않는다. */
export function signRequest(input: {
  method: string;
  path: string;
  timestamp: string;
  accessKey: string;
  secretKey: string;
}) {
  const message = `${input.method} ${input.path}\n${input.timestamp}\n${input.accessKey}`;
  return createHmac("sha256", input.secretKey).update(message).digest("base64");
}

function sendPath(serviceId: string) {
  return `/alimtalk/v2/services/${serviceId}/messages`;
}

/** 예약 발송 한 건을 취소한다. reserveId는 발송 응답의 requestId다. */
export async function cancelAlimtalkReservation(requestId: string) {
  const config = requireSensAlimtalkConfig();
  const reserveId = encodeURIComponent(requestId);
  const path = `/alimtalk/v2/services/${config.serviceId}/reservations/${reserveId}`;
  const timestamp = Date.now().toString();
  const url = sendUrl(path);

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "x-ncp-apigw-timestamp": timestamp,
      "x-ncp-iam-access-key": config.accessKey,
      "x-ncp-apigw-signature-v2": signRequest({
        method: "DELETE",
        path,
        timestamp,
        accessKey: config.accessKey,
        secretKey: config.secretKey,
      }),
    },
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (response.status === 204 || response.status === 404) return;
  throw new AlimtalkError("알림톡 예약 취소에 실패했습니다.", "SENS_ALIMTALK_UNAVAILABLE", String(response.status));
}

function sendUrl(path: string) {
  const url = new URL(path, SENS_ALIMTALK_ORIGIN);
  if (url.origin !== SENS_ALIMTALK_ORIGIN || url.username || url.password || url.search || url.pathname !== path) {
    throw new AlimtalkError("네이버 클라우드 알림톡 발송 주소가 올바르지 않습니다.", "SENS_ALIMTALK_CONFIG");
  }
  return url;
}

function buildSendBody(channelId: string, input: SendAlimtalkInput) {
  if (!TEMPLATE_CODE.test(input.templateCode)) {
    throw new AlimtalkError("알림톡 템플릿 코드는 20자 이내의 영문·숫자여야 합니다.", "SENS_ALIMTALK_INVALID");
  }
  if (input.messages.length < 1 || input.messages.length > 100) {
    throw new AlimtalkError("알림톡은 한 번에 1건 이상 100건 이하로 보냅니다.", "SENS_ALIMTALK_INVALID");
  }

  return {
    plusFriendId: channelId,
    templateCode: input.templateCode,
    messages: input.messages.map(toMessage),
    ...(input.reserveTime ? { reserveTime: parseReserveTime(input.reserveTime), reserveTimeZone: "Asia/Seoul" } : {}),
  };
}

function toMessage(message: AlimtalkMessage) {
  const to = toPhone(message.phoneNumber);
  const content = requiredText(message.content, "알림톡 내용", 1000);
  const title = optionalText(message.title, "알림톡 강조 제목", 50);
  const buttons = message.buttons?.map(toButton);
  const failover = message.failover ? toFailover(message.failover) : undefined;

  return {
    to,
    content,
    ...(title ? { title } : {}),
    ...(buttons && buttons.length > 0 ? { buttons } : {}),
    ...(message.useSmsFailover !== undefined ? { useSmsFailover: message.useSmsFailover } : {}),
    ...(failover ? { failoverConfig: failover } : {}),
  };
}

function toButton(button: AlimtalkButton) {
  if (!BUTTON_TYPE.has(button.type)) {
    throw new AlimtalkError("알림톡 버튼 유형을 확인해 주세요.", "SENS_ALIMTALK_INVALID");
  }
  const name = requiredText(button.name, "알림톡 버튼 이름", 20);
  if (button.type === "AC" && name !== "채널 추가") {
    throw new AlimtalkError("채널 추가 버튼 이름은 채널 추가입니다.", "SENS_ALIMTALK_INVALID");
  }
  const linkMobile = optionalUrl(button.linkMobile, "알림톡 모바일 링크");
  const linkPc = optionalUrl(button.linkPc, "알림톡 PC 링크");
  if (button.type === "WL" && (!linkMobile || !linkPc)) {
    throw new AlimtalkError("웹 링크 버튼에는 모바일 링크와 PC 링크가 필요합니다.", "SENS_ALIMTALK_INVALID");
  }
  const schemeIos = optionalText(button.schemeIos, "알림톡 iOS 링크", 300);
  const schemeAndroid = optionalText(button.schemeAndroid, "알림톡 Android 링크", 300);
  if (button.type === "AL" && (!schemeIos || !schemeAndroid)) {
    throw new AlimtalkError("앱 링크 버튼에는 iOS 링크와 Android 링크가 필요합니다.", "SENS_ALIMTALK_INVALID");
  }

  return {
    type: button.type,
    name,
    ...(linkMobile ? { linkMobile } : {}),
    ...(linkPc ? { linkPc } : {}),
    ...(schemeIos ? { schemeIos } : {}),
    ...(schemeAndroid ? { schemeAndroid } : {}),
  };
}

function toFailover(failover: AlimtalkFailover) {
  if (failover.type && !FAILOVER_TYPE.has(failover.type)) {
    throw new AlimtalkError("알림톡 대체 발송은 SMS 또는 LMS만 가능합니다.", "SENS_ALIMTALK_INVALID");
  }
  const from = failover.from ? toPhone(failover.from) : undefined;
  const subject = optionalText(failover.subject, "알림톡 대체 발송 제목", 40);
  const content = optionalText(failover.content, "알림톡 대체 발송 내용", 2000);
  if (failover.type === "SMS" && subject) {
    throw new AlimtalkError("SMS 대체 발송에는 제목을 넣지 않습니다.", "SENS_ALIMTALK_INVALID");
  }
  const config = {
    ...(failover.type ? { type: failover.type } : {}),
    ...(from ? { from } : {}),
    ...(subject ? { subject } : {}),
    ...(content ? { content } : {}),
  };
  return Object.keys(config).length > 0 ? config : undefined;
}

function toPhone(phoneNumber: string) {
  const digits = normalizePhoneNumber(phoneNumber);
  if (!/^\d{8,15}$/.test(digits)) {
    throw new AlimtalkError("알림톡 수신번호를 확인해 주세요.", "SENS_ALIMTALK_INVALID");
  }
  return digits;
}

function requiredText(value: string, label: string, maxLength: number) {
  const text = value.trim();
  if (!text || text.length > maxLength) {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  assertSubstituted(text, label);
  return text;
}

function optionalText(value: string | undefined, label: string, maxLength: number) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  if (text.length > maxLength) {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  assertSubstituted(text, label);
  return text;
}

/** 버튼 링크 유효성. 치환이 안 된 변수, localhost, 도메인 없는 주소, 인코딩된 경로는 발송 전에 거절된다. */
function optionalUrl(value: string | undefined, label: string) {
  const text = value?.trim() ?? "";
  if (!text) return "";
  if (text.length > 1000) {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  assertSubstituted(text, label);
  if (/\{[^{}\s]+\}/.test(text)) {
    throw new AlimtalkError(`${label}에 치환되지 않은 변수가 있습니다.`, "SENS_ALIMTALK_INVALID");
  }
  if (/\s/.test(text) || /https?:\/\/\//i.test(text) || /https?:\/\/https?:/i.test(text) || /%2f|%3f/i.test(text)) {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(host)
  ) {
    throw new AlimtalkError(`${label} 값을 확인해 주세요.`, "SENS_ALIMTALK_INVALID");
  }
  return text;
}

function assertSubstituted(text: string, label: string) {
  if (text.includes("#{")) {
    throw new AlimtalkError(`${label}에 치환되지 않은 변수가 있습니다.`, "SENS_ALIMTALK_INVALID");
  }
}

/** 예약은 한국 시간 yyyy-MM-dd HH:mm 이고, 지금부터 10분 이내는 받을 수 없다. */
function parseReserveTime(value: string) {
  const trimmed = value.trim();
  const match = RESERVE_TIME.exec(trimmed);
  if (!match) {
    throw new AlimtalkError("알림톡 예약 시각은 yyyy-MM-dd HH:mm 형식이어야 합니다.", "SENS_ALIMTALK_INVALID");
  }
  const instant = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00+09:00`);
  if (Number.isNaN(instant.getTime())) {
    throw new AlimtalkError("알림톡 예약 시각을 확인해 주세요.", "SENS_ALIMTALK_INVALID");
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const roundtrip = `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}`;
  if (roundtrip !== trimmed) {
    throw new AlimtalkError("알림톡 예약 시각을 확인해 주세요.", "SENS_ALIMTALK_INVALID");
  }
  if (instant.getTime() - Date.now() < TEN_MINUTES_MS) {
    throw new AlimtalkError("알림톡 예약은 10분 이후만 가능합니다.", "SENS_ALIMTALK_INVALID");
  }
  return trimmed;
}

async function readSendResponse(response: Response): Promise<SensSendResponse> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AlimtalkError("네이버 클라우드 알림톡 응답을 읽지 못했습니다.", "SENS_ALIMTALK_UNAVAILABLE");
  }
  if (isSendResponse(payload)) {
    if (!response.ok && payload.statusCode === "202") {
      throw new AlimtalkError("네이버 클라우드 알림톡 발송 요청이 실패했습니다.", "SENS_ALIMTALK_UNAVAILABLE", payload.statusCode);
    }
    return payload;
  }
  const message = errorMessage(payload);
  throw new AlimtalkError(
    message || "네이버 클라우드 알림톡 발송이 거절되었습니다.",
    response.status === 401 || response.status === 403 ? "SENS_ALIMTALK_REJECTED" : "SENS_ALIMTALK_UNAVAILABLE",
    String(response.status),
  );
}

function isSendResponse(value: unknown): value is SensSendResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.requestId === "string" || typeof record.statusCode === "string";
}

function errorMessage(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.message === "string") return record.message;
  if (typeof record.errorMessage === "string") return record.errorMessage;
  return "";
}
