import { formDetailInclude, getCheckInDate, getWeekPeriodKey, resolvePeriodKey } from "@/lib/forms";
import { prisma } from "@/lib/prisma";

import {
  formatCheckInPageDate,
  isFutureDailyDate,
  isFutureWeeklyPeriod,
  isValidCheckInDateKey,
} from "@/lib/checkin-dates";

export {
  formatCheckInPageDate,
  isValidCheckInDateKey,
} from "@/lib/checkin-dates";

export async function getCheckInFormContext(
  userId: string,
  formSlug: "daily-checkin" | "weekly-checkin",
  dateParam?: string,
) {
  const form = await prisma.form.findFirst({
    where: { slug: formSlug, status: "PUBLISHED" },
    include: formDetailInclude,
  });

  if (!form) {
    return null;
  }

  const timezone = form.timezone;
  const today = getCheckInDate(timezone);
  const selectedDate =
    dateParam && isValidCheckInDateKey(dateParam) ? dateParam : today;
  const periodKey = resolvePeriodKey(form, new Date(`${selectedDate}T12:00:00`));
  const currentWeekKey = getWeekPeriodKey(timezone);

  const submission = await prisma.formSubmission.findUnique({
    where: {
      formId_userId_checkInDate: {
        formId: form.id,
        userId,
        checkInDate: periodKey,
      },
    },
    include: {
      answers: {
        include: {
          question: { select: { id: true, prompt: true, order: true } },
          option: { select: { id: true, label: true, emoji: true } },
        },
      },
    },
  });

  const isWeekly = form.schedule === "WEEKLY";
  const isFuture = isWeekly
    ? isFutureWeeklyPeriod(selectedDate, timezone)
    : isFutureDailyDate(selectedDate, timezone);
  const isCurrentPeriod = isWeekly ? periodKey === currentWeekKey : selectedDate === today;

  return {
    form,
    timezone,
    today,
    currentWeekKey,
    selectedDate,
    periodKey,
    submission,
    isFuture,
    isCurrentPeriod,
    isWeekly,
  };
}

export type CheckInFormContext = NonNullable<Awaited<ReturnType<typeof getCheckInFormContext>>>;
