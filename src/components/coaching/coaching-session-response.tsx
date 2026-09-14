"use client";

import { useEffect, useRef, useState } from "react";

import {
  CoachingSessionLogPanel,
  type CoachingLogItem,
} from "@/components/coaching/coaching-session-log-panel";
import { CoachingSessionQnaPanel } from "@/components/coaching/coaching-session-qna-panel";
import type { CoachProfile } from "@/lib/coaching-display";

type QnaMessage = {
  id: string;
  authorRole: "STUDENT" | "COACH";
  authorName: string;
  authorAvatarUrl?: string | null;
  bodyMarkdown: string;
  awaitingReply: boolean;
  createdAt: string;
};

export type CoachingSessionPanel = "log" | "qna";

type CoachingSessionResponseProps = {
  sessionId: string;
  coach: CoachProfile;
  logs: CoachingLogItem[];
  messages: QnaMessage[];
  initialPanel: CoachingSessionPanel;
};

function readPanelFromLocation(): CoachingSessionPanel | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("panel") === "qna") return "qna";
  if (params.get("panel") === "log") return "log";
  if (window.location.hash === "#coaching-qna") return "qna";
  if (window.location.hash === "#coaching-log") return "log";
  return null;
}

function writePanelToLocation(panel: CoachingSessionPanel) {
  const url = new URL(window.location.href);
  url.searchParams.set("panel", panel);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

export function CoachingSessionResponse({
  sessionId,
  coach,
  logs,
  messages,
  initialPanel,
}: CoachingSessionResponseProps) {
  const [panel, setPanel] = useState<CoachingSessionPanel>(initialPanel);
  const switchRef = useRef<HTMLDivElement>(null);
  const pendingReply = messages.some((message) => message.awaitingReply);

  useEffect(() => {
    const fromLocation = readPanelFromLocation();
    if (fromLocation) {
      setPanel(fromLocation);
    }
  }, []);

  function selectPanel(next: CoachingSessionPanel) {
    setPanel(next);
    writePanelToLocation(next);
    switchRef.current?.scrollIntoView({ block: "start" });
  }

  return (
    <section className="glia-session__section glia-session__response" aria-label="회차 기록과 질문">
      <div
        ref={switchRef}
        className="glia-session__switch"
        role="tablist"
        aria-label="한줄 기록과 Q&A"
      >
        <button
          type="button"
          role="tab"
          id="coaching-log-tab"
          className="glia-session__switch-btn"
          aria-selected={panel === "log"}
          aria-controls="coaching-log"
          tabIndex={panel === "log" ? 0 : -1}
          onClick={() => selectPanel("log")}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              selectPanel("qna");
            }
          }}
        >
          한줄 기록
          {logs.length > 0 ? (
            <span className="glia-session__section-count">{logs.length.toLocaleString("ko-KR")}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          id="coaching-qna-tab"
          className="glia-session__switch-btn"
          aria-selected={panel === "qna"}
          aria-controls="coaching-qna"
          tabIndex={panel === "qna" ? 0 : -1}
          onClick={() => selectPanel("qna")}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              selectPanel("log");
            }
          }}
        >
          Q&A
          {messages.length > 0 ? (
            <span className="glia-session__section-count">{messages.length.toLocaleString("ko-KR")}</span>
          ) : null}
          {pendingReply ? <span className="glia-session__switch-wait">답변 대기</span> : null}
        </button>
      </div>

      <div
        id="coaching-log"
        role="tabpanel"
        aria-labelledby="coaching-log-tab"
        hidden={panel !== "log"}
      >
        <CoachingSessionLogPanel sessionId={sessionId} logs={logs} />
      </div>

      <div
        id="coaching-qna"
        role="tabpanel"
        aria-labelledby="coaching-qna-tab"
        hidden={panel !== "qna"}
      >
        <CoachingSessionQnaPanel sessionId={sessionId} coach={coach} messages={messages} />
      </div>
    </section>
  );
}
