import Link from "next/link";

import { listCoachAlimtalkLessons } from "@/lib/coach-alimtalk";
import { requireCoach } from "@/lib/coach";

function formatKst(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export default async function CoachAlimtalkPage() {
  const user = await requireCoach();
  const lessons = await listCoachAlimtalkLessons(user.id);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-emerald-600">Coach Portal</p>
        <h1 className="text-3xl font-semibold tracking-tight">알림톡</h1>
        <p className="mt-1 text-zinc-600">
          라이브 수업 알림은 저장하는 순간에 받는 사람이 고정됩니다. 그때 수강 중이고 휴대폰 번호가
          있는 회원만 예약됩니다. 발송 시각에 대상을 다시 고르지 않습니다. 나중에 수강 등록한 회원은
          등록되는 순간에 추가되고, 예약 뒤에 번호를 입력한 회원은 수업을 다시 저장하기 전까지 포함되지
          않습니다.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          아래 문장은 지금 수업 정보로 다시 만든 미리보기입니다. 이미 접수된 알림 본문은 수업을 다시
          저장하기 전까지 예약 당시 내용 그대로입니다. 이 화면은 카카오톡 도착 여부까지는 보여주지 않습니다.
        </p>
      </div>

      {lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
          <p className="font-medium text-zinc-800">시작 시각이 저장된 라이브 수업이 없습니다</p>
          <p className="mt-2 text-sm text-zinc-500">라이브 수업에서 Zoom 일정과 준비물을 저장하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {lessons.map((lesson) => (
            <article key={lesson.lessonId} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-zinc-500">{lesson.courseTitle}</p>
                  <h2 className="text-lg font-semibold text-zinc-900">{lesson.lessonTitle}</h2>
                  <p className="mt-1 text-sm text-zinc-600">수업 시작 {formatKst(lesson.startsAt)}</p>
                </div>
                <Link href={`/coach/lessons/${lesson.lessonId}`} className="text-sm font-medium text-emerald-700">
                  수업 편집
                </Link>
              </div>

              <p className="text-sm text-zinc-700">
                <span className="font-medium text-zinc-900">알림에 들어가는 준비물 </span>
                {lesson.supplyList}
              </p>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900">예약된 수신자 {lesson.recipients.length}명</h3>
                {lesson.recipients.length === 0 ? (
                  <p className="mt-1 text-sm text-zinc-500">
                    아직 예약된 회원이 없습니다. 휴대폰 번호가 있는 수강생이 있을 때 일정을 저장하면 그 사람이 수신자로 고정됩니다.
                  </p>
                ) : (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {lesson.recipients.map((recipient) => (
                      <li key={recipient.userId} className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-800">
                        {recipient.name} · {recipient.phone}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {lesson.messages.map((message) => (
                  <section key={message.templateCode} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <h3 className="font-medium text-zinc-900">{message.label}</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {message.reserveAt ? `예약 ${formatKst(message.reserveAt)}` : "예약 없음"}
                      {message.recipients.length > 0 ? ` · ${message.recipients.length}명` : ""}
                    </p>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-zinc-800">{message.preview}</pre>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
