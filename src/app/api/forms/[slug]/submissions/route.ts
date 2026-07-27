import { NextResponse } from "next/server";

import { jsonError, resolveUserId } from "@/lib/api";
import {
  getPublishedFormBySlug,
  getFormSubmission,
  listFormSubmissionHistory,
  resolvePeriodKey,
  upsertFormSubmission,
  type SubmitAnswerInput,
} from "@/lib/forms";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const url = new URL(request.url);
    const userId = await resolveUserId(request, {
      userId: url.searchParams.get("userId") ?? undefined,
    });

    const form = await getPublishedFormBySlug(slug);
    const date = url.searchParams.get("date");
    const history = url.searchParams.get("history") === "1";

    if (history) {
      const submissions = await listFormSubmissionHistory({
        formId: form.id,
        userId,
        limit: Number(url.searchParams.get("limit") ?? 30),
      });

      return NextResponse.json({ form: { slug: form.slug, title: form.title }, submissions });
    }

    if (!date) {
      return NextResponse.json({ error: "date or history=1 is required" }, { status: 400 });
    }

    const periodKey = resolvePeriodKey(form, new Date(`${date}T12:00:00`));
    const submission = await getFormSubmission({
      formId: form.id,
      userId,
      periodKey,
    });

    return NextResponse.json({ form: { slug: form.slug, title: form.title }, periodKey, submission });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const body = (await request.json()) as {
      userId?: string;
      answers?: SubmitAnswerInput[];
      periodDate?: string;
    };

    const userId = await resolveUserId(request, body);
    const form = await getPublishedFormBySlug(slug);

    if (!body.answers?.length) {
      return NextResponse.json({ error: "answers is required" }, { status: 400 });
    }

    const submission = await upsertFormSubmission({
      form,
      userId,
      answers: body.answers,
      periodDate: body.periodDate?.trim(),
    });

    return NextResponse.json(submission, { status: 200 });
  } catch (error) {
    return jsonError(error);
  }
}
