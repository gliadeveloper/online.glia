"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CHECKIN_FORM_SLUGS } from "@/lib/checkin-form-templates";

type QuestionDraft = {
  prompt: string;
  type: "SINGLE_CHOICE" | "SHORT_TEXT" | "YES_NO";
  isRequired: boolean;
  options: Array<{ label: string; emoji?: string; value?: string }>;
};

const defaultQuestion = (): QuestionDraft => ({
  prompt: "",
  type: "SINGLE_CHOICE",
  isRequired: true,
  options: [{ label: "옵션 1" }, { label: "옵션 2" }],
});

export function CreateFormPanel() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState("SURVEY");
  const [schedule, setSchedule] = useState("ONCE");
  const [publish, setPublish] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([defaultQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    );
  }

  function addQuestion() {
    setQuestions((current) => [...current, defaultQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((current) => current.filter((_, i) => i !== index));
  }

  function handlePurposeChange(nextPurpose: string) {
    setPurpose(nextPurpose);

    if (nextPurpose === "DAILY_CHECKIN") {
      setSlug(CHECKIN_FORM_SLUGS.daily);
      setSchedule("DAILY");
      return;
    }

    if (nextPurpose === "WEEKLY_CHECKIN") {
      setSlug(CHECKIN_FORM_SLUGS.weekly);
      setSchedule("WEEKLY");
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          purpose,
          schedule,
          publish,
          questions: questions.map((question, index) => ({
            prompt: question.prompt.trim(),
            type: question.type,
            order: index + 1,
            isRequired: question.isRequired,
            options:
              question.type === "SHORT_TEXT"
                ? undefined
                : question.options.map((option, optionIndex) => ({
                    label: option.label.trim(),
                    emoji: option.emoji,
                    value: option.value,
                    order: optionIndex + 1,
                  })),
          })),
        }),
      });

      const data = (await response.json()) as { error?: string; id?: string };

      if (!response.ok) {
        setError(data.error ?? "폼 생성에 실패했습니다.");
        return;
      }

      router.push(`/admin/forms/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">기본 정보</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-zinc-700">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="my-survey"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-violet-300 focus:ring-2"
              required
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-zinc-700">제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="설문 제목"
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-violet-300 focus:ring-2"
              required
            />
          </label>
          <label className="space-y-2 text-sm sm:col-span-2">
            <span className="font-medium text-zinc-700">설명</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-violet-300 focus:ring-2"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-zinc-700">목적</span>
            <select
              value={purpose}
              onChange={(event) => handlePurposeChange(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-violet-300 focus:ring-2"
            >
              <option value="SURVEY">설문</option>
              <option value="DAILY_CHECKIN">데일리 체크인</option>
              <option value="WEEKLY_CHECKIN">주간 체크인</option>
              <option value="INTAKE">인테이크</option>
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-zinc-700">주기</span>
            <select
              value={schedule}
              onChange={(event) => setSchedule(event.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none ring-violet-300 focus:ring-2"
            >
              <option value="ONCE">1회</option>
              <option value="DAILY">매일</option>
              <option value="WEEKLY">매주</option>
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={publish}
            onChange={(event) => setPublish(event.target.checked)}
            className="rounded border-zinc-300"
          />
          생성 즉시 발행
        </label>
        {(purpose === "DAILY_CHECKIN" || purpose === "WEEKLY_CHECKIN") && (
          <p className="mt-3 text-sm text-amber-700">
            체크인 폼은 slug가 <code className="rounded bg-amber-100 px-1">{slug}</code> 이고
            발행(PUBLISHED) 상태여야 고객 화면에 표시됩니다.{" "}
            <a href="/admin/checkins/forms" className="font-medium underline">
              체크인 폼 등록
            </a>
            에서 기본 템플릿을 한 번에 등록할 수도 있습니다.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">질문</h2>
          <button
            type="button"
            onClick={addQuestion}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            질문 추가
          </button>
        </div>

        {questions.map((question, index) => (
          <div
            key={index}
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-zinc-500">Q{index + 1}</p>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(index)}
                  className="text-xs text-red-600"
                >
                  삭제
                </button>
              )}
            </div>

            <div className="mt-3 grid gap-3">
              <input
                value={question.prompt}
                onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                placeholder="질문 내용"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm outline-none ring-violet-300 focus:ring-2"
                required
              />
              <div className="flex flex-wrap gap-3">
                <select
                  value={question.type}
                  onChange={(event) =>
                    updateQuestion(index, {
                      type: event.target.value as QuestionDraft["type"],
                      options:
                        event.target.value === "SHORT_TEXT"
                          ? []
                          : question.options.length
                            ? question.options
                            : [{ label: "옵션 1" }, { label: "옵션 2" }],
                    })
                  }
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                >
                  <option value="SINGLE_CHOICE">단일 선택</option>
                  <option value="YES_NO">예/아니오</option>
                  <option value="SHORT_TEXT">단답형</option>
                </select>
                <label className="flex items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={question.isRequired}
                    onChange={(event) =>
                      updateQuestion(index, { isRequired: event.target.checked })
                    }
                  />
                  필수
                </label>
              </div>

              {question.type !== "SHORT_TEXT" && (
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex gap-2">
                      <input
                        value={option.label}
                        onChange={(event) => {
                          const next = [...question.options];
                          next[optionIndex] = { ...next[optionIndex], label: event.target.value };
                          updateQuestion(index, { options: next });
                        }}
                        placeholder={`옵션 ${optionIndex + 1}`}
                        className="flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                        required
                      />
                      <input
                        value={option.emoji ?? ""}
                        onChange={(event) => {
                          const next = [...question.options];
                          next[optionIndex] = {
                            ...next[optionIndex],
                            emoji: event.target.value || undefined,
                          };
                          updateQuestion(index, { options: next });
                        }}
                        placeholder="😀"
                        className="w-16 rounded-xl border border-zinc-200 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      updateQuestion(index, {
                        options: [...question.options, { label: `옵션 ${question.options.length + 1}` }],
                      })
                    }
                    className="text-xs font-medium text-violet-600"
                  >
                    + 옵션 추가
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/forms")}
          className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-700"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? "생성 중..." : "폼 생성"}
        </button>
      </div>
    </form>
  );
}
