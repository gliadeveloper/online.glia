import type { AlimtalkButton } from "@/lib/alimtalk/send";

export const ALIMTALK_TEMPLATE = {
  signup: "SIGNUPOK",
  liveDay: "LIVEDAY",
  liveHour: "LIVEHOUR",
  liveSoon: "LIVE15MIN",
  faqReply: "FAQREPLY",
} as const;

export type LiveReminderCode =
  | typeof ALIMTALK_TEMPLATE.liveDay
  | typeof ALIMTALK_TEMPLATE.liveHour
  | typeof ALIMTALK_TEMPLATE.liveSoon;

const SIGNUP_CONTENT = `#{name}님, 웰니스몰글리아 가입을
환영합니다

차분하고 빛나게 지속되는 변화를
글리아 회복운동에서 시작해보세요`;

const SIGNUP_TITLE = "가입을 환영합니다";

const LIVE_DAY = `[라이브 수업 안내]
#{name}님, 수강 등록하신 #{className} 라이브 수업이 내일 진행됩니다.

▶ 수업일시: #{startTime}
▶ 준비물: #{list}

수업 시작 15분 전부터 입장이 가능합니다. 아래 참여 링크로 입장해 주세요.`;

const LIVE_HOUR = `[라이브 수업 안내]
#{name}님, 수강 등록하신 #{className} 라이브 수업이 1시간 뒤에 시작됩니다.

▶ 수업일시: #{startTime}
▶ 준비물: #{list}

수업 시작 15분 전부터 입장이 가능합니다. 아래 참여 링크로 입장해 주세요.`;

const LIVE_SOON = `[라이브 수업 안내]
#{name}님, 수강 등록하신 #{className} 라이브 수업이 15분 뒤에 시작됩니다.

▶ 수업일시: #{startTime}
▶ 준비물: #{list}

지금 입장할 수 있습니다. 아래 참여 링크로 입장해 주세요.`;

const FAQ_REPLY = `[FAQ 댓글 안내]
#{name}님, 남겨 주신 질문에 답변이 등록되었습니다.

▶ 강의: #{className}
▶ 질문: #{title}
▶ 답변: #{summaryBody}

아래 링크에서 답변을 확인해 주세요.`;

export function renderTemplate(template: string, values: Record<string, string>) {
  return template.replace(/#\{([^{}]+)\}/g, (token, key: string) => {
    const value = values[key]?.trim();
    if (!value) {
      throw new Error(`알림톡 변수 ${key}가 비어 있습니다.`);
    }
    return value.replace(/#\{/g, "").replace(/[{}]/g, "");
  });
}

export function signupMessage(name: string) {
  return {
    templateCode: ALIMTALK_TEMPLATE.signup,
    content: renderTemplate(SIGNUP_CONTENT, { name }),
    title: SIGNUP_TITLE,
    buttons: [
      {
        type: "WL" as const,
        name: "지금 확인하기",
        linkMobile: "https://online.glia.kr/shop",
        linkPc: "https://online.glia.kr/shop",
      },
    ] satisfies AlimtalkButton[],
  };
}

export function liveMessage(
  code: LiveReminderCode,
  values: { name: string; className: string; startTime: string; list: string; id: string },
) {
  const template =
    code === ALIMTALK_TEMPLATE.liveDay ? LIVE_DAY : code === ALIMTALK_TEMPLATE.liveHour ? LIVE_HOUR : LIVE_SOON;
  const link = `https://online.glia.kr/learning/${values.id}`;
  return {
    templateCode: code,
    content: renderTemplate(template, values),
    buttons: [
      {
        type: "WL" as const,
        name: "참여 링크",
        linkMobile: link,
        linkPc: link,
      },
    ] satisfies AlimtalkButton[],
  };
}

export function faqReplyMessage(values: {
  name: string;
  className: string;
  title: string;
  summaryBody: string;
  link: string;
}) {
  const url = `https://online.glia.kr/${values.link}`;
  return {
    templateCode: ALIMTALK_TEMPLATE.faqReply,
    content: renderTemplate(FAQ_REPLY, values),
    buttons: [
      {
        type: "WL" as const,
        name: "답변 확인",
        linkMobile: url,
        linkPc: url,
      },
    ] satisfies AlimtalkButton[],
  };
}
