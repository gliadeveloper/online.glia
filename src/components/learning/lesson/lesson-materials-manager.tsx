"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import {
  formatLessonMaterialSize,
  LESSON_MATERIAL_ACCEPT,
  lessonMaterialTypeLabel,
  MAX_LESSON_MATERIAL_BYTES,
  MAX_LESSON_MATERIALS,
  type LessonMaterialPublic,
} from "@/lib/lesson-material-constants";

type LessonMaterialsManagerProps = {
  lessonId: string;
  materials: LessonMaterialPublic[];
  apiRole: "coach" | "admin";
};

export function LessonMaterialsManager({
  lessonId,
  materials,
  apiRole,
}: LessonMaterialsManagerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accent =
    apiRole === "admin"
      ? "bg-violet-600 hover:bg-violet-700"
      : "bg-emerald-600 hover:bg-emerald-700";
  const uploadUrl = `/api/${apiRole}/lessons/${lessonId}/materials`;
  const canUpload = materials.length < MAX_LESSON_MATERIALS;

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("수업자료 파일을 선택해 주세요.");
      return;
    }

    if (file.size > MAX_LESSON_MATERIAL_BYTES) {
      setError("수업자료는 20MB 이하만 업로드할 수 있습니다.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (title.trim()) {
        formData.append("title", title.trim());
      }

      const response = await fetch(uploadUrl, { method: "POST", body: formData });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "수업자료 업로드에 실패했습니다.");
        return;
      }

      setTitle("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(materialId: string, label: string) {
    if (!window.confirm(`「${label}」 수업자료를 삭제할까요?`)) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/${apiRole}/materials/${materialId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "수업자료 삭제에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="font-semibold text-zinc-900">수업자료</h2>
        <p className="mt-1 text-sm text-zinc-500">
          PDF, PPT, Word, Excel, ZIP, 이미지, 텍스트 · 파일당 20MB · 최대 {MAX_LESSON_MATERIALS}개.
          수강생은 다운로드만 할 수 있습니다.
        </p>
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <form onSubmit={handleUpload} className="space-y-3">
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">표시 이름 (선택)</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="비워 두면 파일 이름을 사용합니다"
            maxLength={80}
            className="w-full rounded-xl border border-zinc-200 px-4 py-3"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium text-zinc-800">파일</span>
          <input
            ref={fileInputRef}
            type="file"
            accept={LESSON_MATERIAL_ACCEPT}
            className="w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:font-medium file:text-zinc-800"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !canUpload}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${accent}`}
        >
          {busy ? "처리 중…" : canUpload ? "업로드" : `최대 ${MAX_LESSON_MATERIALS}개`}
        </button>
      </form>

      {materials.length === 0 ? (
        <p className="text-sm text-zinc-500">등록된 수업자료가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {materials.map((material) => (
            <li key={material.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-zinc-900">{material.title}</p>
                <p className="mt-0.5 truncate text-sm text-zinc-500">
                  {lessonMaterialTypeLabel(material.contentType, material.originalName)} ·{" "}
                  {formatLessonMaterialSize(material.byteSize)} · {material.originalName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={`/api/learning/lessons/${lessonId}/materials/${material.id}`}
                  className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                >
                  받기
                </a>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(material.id, material.title)}
                  className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
