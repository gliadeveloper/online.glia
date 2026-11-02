import "server-only";

import { AlimtalkError, parseSensAlimtalkEnv, type SensAlimtalkConfig } from "@/lib/alimtalk/env";

export function getSensAlimtalkConfig(): SensAlimtalkConfig | null {
  return parseSensAlimtalkEnv(process.env);
}

export function requireSensAlimtalkConfig(): SensAlimtalkConfig {
  const config = getSensAlimtalkConfig();
  if (!config) {
    throw new AlimtalkError("네이버 클라우드 알림톡 설정이 없습니다.", "SENS_ALIMTALK_CONFIG");
  }
  return config;
}
