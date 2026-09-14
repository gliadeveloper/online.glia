import { formatPostRelativeTime } from "@/lib/post-content";

export type CoachSessionLog = {
  id: string;
  body: string;
  createdAt: string;
};

export function CoachSessionLogPanel({ logs }: { logs: CoachSessionLog[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-zinc-900">한줄 기록</h2>
      <p className="mt-1 text-sm text-zinc-500">
        회원이 과제를 마친 뒤 남긴 기록입니다. 답변하지 않아도 됩니다.
      </p>

      {logs.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500">아직 기록이 없습니다.</p>
      ) : (
        <ol className="mt-5 divide-y divide-zinc-100">
          {logs.map((log) => (
            <li key={log.id} className="py-3.5 first:pt-0">
              <time className="text-xs text-zinc-400" dateTime={log.createdAt}>
                {formatPostRelativeTime(new Date(log.createdAt))}
              </time>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{log.body}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
