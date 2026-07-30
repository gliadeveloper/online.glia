import type { CheckInReportItem } from "@/lib/checkin-report";

export type CheckInShareScopeType = "WEEK" | "RANGE";

export type CheckInShareDailySection = {
  dateKey: string;
  weekdayLabel: string;
  recorded: boolean;
  items: CheckInReportItem[];
};

export type CheckInShareWeeklySection = {
  weekPeriodKey: string;
  periodLabel: string;
  recorded: boolean;
  items: CheckInReportItem[];
};

export type CheckInShareReportContent = {
  title: string;
  scopeLabel: string;
  scopeType: CheckInShareScopeType;
  dailySections: CheckInShareDailySection[];
  weeklySections: CheckInShareWeeklySection[];
  summary: {
    dailyRecorded: number;
    dailyInScope: number;
    weeklyRecorded: number;
    weeklyInScope: number;
  };
};

export type CheckInShareScopeInput =
  | { scopeType: "WEEK"; weekPeriodKey: string }
  | { scopeType: "RANGE"; startDate: string; endDate: string };

export type CheckInShareGrantPreview = {
  grantId: string;
  status: string;
  scopeType: CheckInShareScopeType;
  scopeLabel: string;
  coachMessage: string | null;
  coachName: string;
  sessionNo: number;
  sessionTitle: string;
  requestedAt: string;
  content: CheckInShareReportContent;
  canAccept: boolean;
  canDecline: boolean;
};
