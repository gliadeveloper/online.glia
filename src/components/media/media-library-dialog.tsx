"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileAudio, Film, ImageIcon, Library, Upload, X } from "lucide-react";
import { changeMediaLibraryStatus, fetchMediaLibrary, LIBRARY_FILE_ACCEPT, type LibraryItem, type LibraryScope, type LibraryStatus, type MediaApiRole, type UploadedMedia } from "@/lib/media/library-client";
import "./media-library.css";

type Props = {
  apiRole: MediaApiRole; disabled: boolean;
  uploadEnabled: boolean;
  onChoose: (media: UploadedMedia) => void;
  onUpload: (file: File, scope: LibraryScope) => Promise<void>;
};

export function MediaLibraryDialog({ apiRole, disabled, uploadEnabled, onChoose, onUpload }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const label = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<LibraryScope | "UPLOAD">("PERSONAL");
  const [kind, setKind] = useState("");
  const [scope, setScope] = useState<LibraryScope>("PERSONAL");
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>("ACTIVE");
  const [changing, setChanging] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [reload, setReload] = useState(0);
  const pageRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || tab === "UPLOAD") return;
    const controller = new AbortController();
    pageRequest.current?.abort();
    pageRequest.current = controller;
    // Reset before fetching so an old scope is never selectable during a new query.
    Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setItems([]); setCursor(null); setSelected(null); setConfirmTrash(false); setLoading(true); setError(null);
      try {
        const page = await fetchMediaLibrary(apiRole, tab, kind, undefined, controller.signal, libraryStatus);
        if (!controller.signal.aborted) { setItems(page.items); setCursor(page.nextCursor); }
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    });
    return () => controller.abort();
  }, [apiRole, tab, kind, open, reload, libraryStatus]);

  async function more() {
    if (!cursor || loading || tab === "UPLOAD") return;
    const controller = new AbortController();
    pageRequest.current?.abort(); pageRequest.current = controller;
    setLoading(true); setError(null);
    try {
      const page = await fetchMediaLibrary(apiRole, tab, kind, cursor, controller.signal, libraryStatus);
      if (!controller.signal.aborted) {
        setItems(previous => [...previous, ...page.items.filter(i => !previous.some(p => p.id === i.id))]);
        setCursor(page.nextCursor);
      }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  function close() { if (!changing) dialog.current?.close(); }
  function clearSelection() { pageRequest.current?.abort(); setItems([]); setCursor(null); setSelected(null); setConfirmTrash(false); setError(null); setNotice(null); }
  async function changeStatus(status: LibraryStatus) {
    if (!selected?.canManage || changing || disabled) return;
    const item = selected;
    setChanging(true); setNotice(null); setError(null);
    try {
      await changeMediaLibraryStatus(apiRole, item, status);
      setNotice(status === "TRASHED" ? "휴지통으로 옮겼습니다. 기존 콘텐츠는 계속 사용할 수 있습니다." : "자료를 복원했습니다. 보관함에서 다시 선택할 수 있습니다.");
    } catch (e) {
      // A lost response may have committed. Reload before offering another action.
      setNotice(e instanceof Error ? e.message : "변경 결과를 확인하지 못했습니다. 목록을 다시 확인해 주세요.");
    } finally {
      setSelected(null); setConfirmTrash(false); setChanging(false); setReload(value => value + 1);
    }
  }
  function choose(item: LibraryItem) {
    const file = item.files.find(f => f.role === "ORIGINAL");
    if (!file || disabled || changing || item.libraryStatus === "TRASHED") return;
    onChoose({ assetId: item.id, url: file.url, kind: item.kind, name: item.originalName });
    close();
  }
  const preview = selected?.files.find(f => f.role === "PLAYBACK") ?? selected?.files.find(f => f.role === "ORIGINAL");

  return <div className="media-library-toolbar">
    <button type="button" className="media-library-button" disabled={disabled} onClick={() => { setOpen(true); dialog.current?.showModal(); }}>
      <Library size={16} aria-hidden /> 자료 보관함
    </button>
    <span>공통 자료와 내 자료를 코스·코칭에서 함께 사용할 수 있어요.</span>
    <dialog ref={dialog} className="media-library-dialog" aria-labelledby={label} onCancel={event => { if (changing) event.preventDefault(); }} onClose={() => { setOpen(false); pageRequest.current?.abort(); }}>
      <header className="media-library-header">
        <div><h2 id={label}>자료 보관함</h2><p>보관한 자료를 선택하거나 새 파일을 올려 주세요.</p></div>
        <button type="button" className="media-library-icon-button" aria-label="보관함 닫기" disabled={changing} onClick={close}><X size={20} /></button>
      </header>
      <div className="media-library-tabs" role="group" aria-label="자료 구분">
        {([["PERSONAL", "내 자료"], ["SHARED", "공통 자료"], ["UPLOAD", "새 업로드"]] as const).filter(([value]) => value !== "UPLOAD" || uploadEnabled).map(([value, name]) =>
          <button type="button" key={value} disabled={changing} aria-pressed={tab === value} onClick={() => { if (tab === value) return; clearSelection(); setTab(value); setLibraryStatus("ACTIVE"); }}>{name}</button>)}
      </div>
      {tab === "UPLOAD" && uploadEnabled ? <div className="media-library-upload">
        <Upload size={28} aria-hidden />
        <h3>다음에도 사용할 자료를 보관하세요</h3>
        <p>이미지 10MB · 오디오 200MB · 영상 500MB까지 올릴 수 있어요.</p>
        {apiRole === "admin" ? <label>보관 위치<select value={scope} onChange={e => setScope(e.target.value as LibraryScope)} disabled={disabled}>
          <option value="PERSONAL">내 자료</option><option value="SHARED">공통 자료</option>
        </select></label> : <p>새 파일은 내 자료에 보관됩니다.</p>}
        <label className="media-library-file-input">파일 선택<input aria-label="새 미디어 파일" type="file" accept={LIBRARY_FILE_ACCEPT} disabled={disabled} onChange={e => {
          const file = e.currentTarget.files?.[0]; e.currentTarget.value = "";
          if (file) { close(); void onUpload(file, scope); }
        }} /></label>
        <p className="media-library-note">파일 확인이 끝나면 본문에 추가됩니다. 본문에서 지워도 보관함의 자료는 유지됩니다.</p>
      </div> : <>
        <div className="media-library-filter">
          <label>파일 종류<select aria-label="파일 종류" disabled={changing} value={kind} onChange={e => { clearSelection(); setKind(e.target.value); }}>
            <option value="">전체</option><option value="IMAGE">이미지</option><option value="VIDEO">영상</option><option value="AUDIO">오디오</option>
          </select></label>
          <div className="media-library-actions">
            {tab === "PERSONAL" || apiRole === "admin" ? <button type="button" className="media-library-button" disabled={changing} aria-pressed={libraryStatus === "TRASHED"} onClick={() => { clearSelection(); setLibraryStatus(value => value === "ACTIVE" ? "TRASHED" : "ACTIVE"); }}>{libraryStatus === "ACTIVE" ? "휴지통 보기" : "보관함 보기"}</button> : null}
            <button type="button" className="media-library-button" disabled={loading || changing} onClick={() => { setNotice(null); setReload(v => v + 1); }}>새로고침</button>
          </div>
        </div>
        {notice ? <p className="media-library-notice" role="status">{notice}</p> : null}
        {libraryStatus === "TRASHED" ? <p className="media-library-notice">휴지통 · 새 본문에는 넣을 수 없습니다. 기존 콘텐츠에서 사용하는 자료는 보존하며, 삭제가 시작되기 전까지 복원할 수 있습니다.</p> : null}
        <div className="media-library-content">
          <div className="media-library-list" aria-label="보관 자료 목록" aria-busy={loading}>
            {error ? <p role="alert" className="media-library-error">{error} <button type="button" onClick={() => setReload(v => v + 1)}>다시 불러오기</button></p> : null}
            {!loading && !error && !items.length ? <p className="media-library-empty">{libraryStatus === "TRASHED" ? "복원할 자료가 없습니다." : tab === "PERSONAL" ? "아직 보관한 자료가 없습니다. 새 파일을 올려 보세요." : "등록된 공통 자료가 없습니다."}</p> : null}
            {items.map(item => {
              const Icon = item.kind === "IMAGE" ? ImageIcon : item.kind === "VIDEO" ? Film : FileAudio;
              const bytes = Number(item.files.find(f => f.role === "ORIGINAL")?.byteSize ?? 0);
              return <button type="button" key={item.id} disabled={changing} className="media-library-item" aria-pressed={selected?.id === item.id} onClick={() => { setSelected(item); setPreviewError(false); setConfirmTrash(false); }}>
                <Icon size={24} aria-hidden /><span><strong>{item.originalName}</strong><small>{item.kind === "IMAGE" ? "이미지" : item.kind === "VIDEO" ? "영상" : "오디오"} · {bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`}</small></span>
              </button>;
            })}
            {loading ? <p role="status" className="media-library-empty">자료를 불러오는 중…</p> : null}
            {cursor ? <button type="button" className="media-library-button media-library-more" disabled={loading || changing} onClick={() => void more()}>더 보기</button> : null}
          </div>
          <div className="media-library-preview" aria-label="자료 미리보기">
            {selected && preview ? <>
              <h3>{selected.originalName}</h3>
              {previewError ? <p role="status">미리보기를 불러오지 못했습니다. 자료를 새로고침해 주세요.</p> : selected.kind === "IMAGE" ?
                // Authenticated image URLs must not pass through the unauthenticated Next image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.url} alt={selected.originalName} onError={() => setPreviewError(true)} /> : selected.kind === "VIDEO" ?
                <video key={preview.url} src={preview.url} controls playsInline preload="metadata" onError={() => setPreviewError(true)} /> :
                <audio key={preview.url} src={preview.url} controls preload="metadata" onError={() => setPreviewError(true)} />}
              <p className="media-library-note">{selected.usageCount > 0 ? `${selected.usageCount}개 콘텐츠에서 사용 중입니다. 보관함에서 치워도 해당 콘텐츠는 유지됩니다.` : "현재 저장된 콘텐츠에서 사용하지 않는 자료입니다."}</p>
              {selected.libraryStatus === "TRASHED" ? <>
                {selected.trashExpiresAt ? <p className="media-library-note">삭제 유예 종료: {new Date(selected.trashExpiresAt).toLocaleDateString("ko-KR")}<br />사용 중인 자료는 유예가 끝나도 삭제하지 않습니다.</p> : null}
                {selected.canManage ? <button type="button" className="media-library-primary" disabled={disabled || changing} onClick={() => void changeStatus("ACTIVE")}>{changing ? "복원 중…" : "복원"}</button> : null}
              </> : <>
                <button type="button" className="media-library-primary" disabled={disabled || previewError || changing} onClick={() => choose(selected)}>본문에 넣기</button>
                {selected.canManage ? confirmTrash ? <div className="media-library-confirm">
                  <p>이 자료를 휴지통으로 옮길까요? 기존 콘텐츠는 그대로 유지됩니다.</p>
                  <div className="media-library-actions"><button type="button" className="media-library-button" disabled={changing} onClick={() => setConfirmTrash(false)}>취소</button>
                    <button type="button" className="media-library-button" disabled={disabled || changing} onClick={() => void changeStatus("TRASHED")}>{changing ? "이동 중…" : "휴지통으로 이동"}</button></div>
                </div> : <button type="button" className="media-library-button" disabled={disabled || changing} onClick={() => setConfirmTrash(true)}>휴지통으로 이동</button> : null}
              </>}
            </> : <p>자료를 선택하면 미리 볼 수 있어요.</p>}
          </div>
        </div>
      </>}
    </dialog>
  </div>;
}
