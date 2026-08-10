export type CheckInSchedule = "daily" | "weekly";

export function checkInFormPath(
  schedule: CheckInSchedule,
  periodKey: string,
  options?: { redo?: boolean },
) {
  const base =
    schedule === "weekly"
      ? `/checkin/weekly/${periodKey}`
      : `/checkin/daily/${periodKey}`;

  return options?.redo ? `${base}?redo=1` : base;
}

export function checkInReportPath(
  schedule: CheckInSchedule,
  periodKey: string,
  options?: { saved?: boolean },
) {
  const base =
    schedule === "weekly"
      ? `/checkin/weekly/report/${periodKey}`
      : `/checkin/daily/report/${periodKey}`;

  return options?.saved ? `${base}?saved=1` : base;
}

export function withCheckInReportSavedQuery(path: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}saved=1`;
}

export function resolveCheckInHref(
  schedule: CheckInSchedule,
  periodKey: string,
  hasSubmission: boolean,
) {
  return hasSubmission
    ? checkInReportPath(schedule, periodKey)
    : checkInFormPath(schedule, periodKey);
}

export function isCheckInRedoSearchParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}

export function isCheckInSavedSearchParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "true";
}
