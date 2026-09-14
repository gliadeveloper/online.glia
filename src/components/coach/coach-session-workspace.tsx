"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CoachSessionFeedbackPanel } from "@/components/coach/coach-session-feedback-panel";
import { CoachSessionLogPanel, type CoachSessionLog } from "@/components/coach/coach-session-log-panel";
import { CoachSessionQnaPanel } from "@/components/coach/coach-session-qna-panel";
import {
  coachPublicationLabels,
  displayName,
  seoulDateKey,
} from "@/lib/coach-coaching-board";
import type { CoachingSessionPublicationStatus } from "@/generated/prisma/client";

type Message = {
  id: string;
  authorRole: "STUDENT" | "COACH";
  authorName: string;
  bodyMarkdown: string;
  awaitingReply: boolean;
  createdAt: string;
};

type CoachSessionWorkspaceProps = {
  sessionId: string;
  entitlementId: string;
  sessionNo: number;
  title: string;
  studentName: string;
  studentEmail: string;
  offeringTitle: string;
  scheduledAt: string;
  publicationStatus: CoachingSessionPublicationStatus;
  pendingReplyCount: number;
  logCount: number;
  initialTab: "feedback" | "qna" | "logs";
  summary: string | null;
  bodyMarkdown: string | null;
  bodyMetadata: unknown;
  messages: Message[];
  logs: CoachSessionLog[];
};

export function CoachSessionWorkspace(props: CoachSessionWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"feedback" | "qna" | "logs">(props.initialTab);
  const [feedbackReady, setFeedbackReady] = useState(props.initialTab === "feedback");
  const [date, setDate] = useState(seoulDateKey(props.scheduledAt));
  const [savingDate, setSavingDate] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const dateDirty = date !== seoulDateKey(props.scheduledAt);
  const overdue = date < seoulDateKey(new Date()) && props.publicationStatus !== "PUBLISHED";

  async function saveDate() {
    setSavingDate(true);
    setDateError(null);
    try {
      const response = await fetch(`/api/coach/sessions/${props.sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: date }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setDateError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setDateError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingDate(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link href="/coach/coaching?tab=publish" className="font-medium text-emerald-700 hover:underline">
          ← 코칭 관리
        </Link>
        <Link
          href={`/coach/coaching/entitlements/${props.entitlementId}`}
          className="text-zinc-500 hover:text-zinc-800"
        >
          {displayName({ name: props.studentName, email: props.studentEmail })} 코칭권
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {props.sessionNo}회차 · {props.title}
          </h1>
          <p className="mt-1 text-zinc-600">
            {props.studentName} · {props.offeringTitle}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            props.publicationStatus === "PUBLISHED"
              ? "bg-emerald-50 text-emerald-800"
              : props.publicationStatus === "DRAFT"
                ? "bg-amber-50 text-amber-800"
                : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {coachPublicationLabels[props.publicationStatus]}
        </span>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-zinc-700">발행일</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="block rounded-xl border border-zinc-200 px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={savingDate || !dateDirty}
            onClick={saveDate}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 disabled:opacity-50"
          >
            {savingDate ? "저장 중…" : "발행일 저장"}
          </button>
        </div>
        {overdue ? (
          <p className="mt-3 text-sm text-amber-800">발행일이 지났습니다. 지금 발행할 수 있습니다.</p>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">날짜는 안내입니다. 그날 전이든 후든 발행할 수 있습니다.</p>
        )}
        {dateError ? <p className="mt-2 text-sm text-red-700">{dateError}</p> : null}
      </section>

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => {
            setFeedbackReady(true);
            setTab("feedback");
          }}
          className={`px-4 py-2.5 text-sm font-medium ${
            tab === "feedback"
              ? "border-b-2 border-emerald-600 text-emerald-800"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          피드백
        </button>
        <button
          type="button"
          onClick={() => setTab("qna")}
          className={`px-4 py-2.5 text-sm font-medium ${
            tab === "qna"
              ? "border-b-2 border-emerald-600 text-emerald-800"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          Q&A
          {props.pendingReplyCount > 0 ? (
            <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {props.pendingReplyCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setTab("logs")}
          className={`px-4 py-2.5 text-sm font-medium ${
            tab === "logs"
              ? "border-b-2 border-emerald-600 text-emerald-800"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          한줄 기록
          {props.logCount > 0 ? (
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
              {props.logCount}
            </span>
          ) : null}
        </button>
      </div>

      {feedbackReady ? (
        <div hidden={tab !== "feedback"}>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">회차 피드백</h2>
            <p className="mt-1 text-sm text-zinc-600">회원에게 전달할 피드백을 작성합니다.</p>
            <div className="mt-4">
              <CoachSessionFeedbackPanel
                sessionId={props.sessionId}
                summary={props.summary}
                bodyMarkdown={props.bodyMarkdown}
                bodyMetadata={props.bodyMetadata}
                publicationStatus={props.publicationStatus}
              />
            </div>
          </section>
        </div>
      ) : null}

      <div hidden={tab !== "qna"}>
        <CoachSessionQnaPanel
          sessionId={props.sessionId}
          studentName={props.studentName}
          published={props.publicationStatus === "PUBLISHED"}
          messages={props.messages}
        />
      </div>

      <div hidden={tab !== "logs"}>
        <CoachSessionLogPanel logs={props.logs} />
      </div>
    </div>
  );
}
