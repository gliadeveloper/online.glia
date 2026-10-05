"use client";

import Link from "next/link";
import { useState } from "react";

import { LessonQnaThread } from "@/components/learning/lesson/lesson-qna-panel";
import type { LessonQnaQuestion } from "@/lib/lesson-qna";

type CoachLessonQuestionsProps = {
  filter: "open" | "all";
  questions: LessonQnaQuestion[];
  initialQuestionId?: string;
};

export function CoachLessonQuestions({
  filter,
  questions: initialQuestions,
  initialQuestionId,
}: CoachLessonQuestionsProps) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [openId, setOpenId] = useState<string | null>(initialQuestionId ?? questions[0]?.id ?? null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Coach Portal</p>
        <h1 className="text-3xl font-semibold tracking-tight">강의 질문</h1>
        <p className="mt-1 text-zinc-600">
          미답변은 아직 강사 답변이 없고 닫히지 않은 질문입니다.
        </p>
      </div>

      <div className="flex gap-2">
        <FilterLink href="/coach/questions?filter=open" active={filter === "open"}>
          미답변
        </FilterLink>
        <FilterLink href="/coach/questions?filter=all" active={filter === "all"}>
          전체
        </FilterLink>
      </div>

      {questions.length === 0 ? (
        <p className="rounded-2xl border border-zinc-200 bg-white px-5 py-10 text-center text-sm text-zinc-500">
          {filter === "open" ? "답할 질문이 없습니다." : "아직 강의 질문이 없습니다."}
          {filter === "open" ? (
            <>
              {" "}
              <Link href="/coach/questions?filter=all" className="font-medium text-emerald-700">
                전체 보기
              </Link>
            </>
          ) : null}
        </p>
      ) : (
        <ul className="rounded-2xl border border-zinc-200 bg-white px-4">
          {questions.map((question) => (
            <LessonQnaThread
              key={question.id}
              lessonId={question.lessonId}
              question={question}
              open={openId === question.id}
              showContext
              onToggle={() => setOpenId((current) => (current === question.id ? null : question.id))}
              onChange={(next) =>
                setQuestions((current) => {
                  const replaced = current.map((item) => (item.id === next.id ? next : item));
                  if (filter !== "open") return replaced;
                  return replaced.filter(
                    (item) => !item.isClosed && !item.replies.some((reply) => reply.author.isInstructor),
                  );
                })
              }
              onRemove={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
        active ? "bg-emerald-600 text-white" : "bg-white text-zinc-600 ring-1 ring-zinc-200"
      }`}
    >
      {children}
    </Link>
  );
}
