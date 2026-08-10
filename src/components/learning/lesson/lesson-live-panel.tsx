"use client";

type LessonLivePanelProps = {
  zoomUrl?: string | null;
};

export function LessonLivePanel({ zoomUrl }: LessonLivePanelProps) {
  if (!zoomUrl) {
    return (
      <div className="lesson-live-panel">
        <p className="lesson-live-panel__label">라이브</p>
        <p className="lesson-live-panel__desc">Zoom 링크가 아직 등록되지 않았습니다.</p>
      </div>
    );
  }

  return (
    <div className="lesson-live-panel">
      <p className="lesson-live-panel__label">라이브</p>
      <p className="lesson-live-panel__desc">Zoom 링크로 라이브 수업에 참여하세요.</p>
      <div className="lesson-live-panel__actions">
        <a href={zoomUrl} target="_blank" rel="noreferrer" className="lesson-live-panel__btn">
          Zoom 입장하기
        </a>
      </div>
    </div>
  );
}
