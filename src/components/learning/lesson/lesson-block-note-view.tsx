"use client";

import type { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect, useRef } from "react";

import "./lesson-block-editor.css";
import "./lesson-block-note-view.css";

type LessonBlockNoteViewProps = {
  blocks: Block[];
  className?: string;
};

/** Read-only default BlockNote view (same blocks as editor). */
export function LessonBlockNoteView({ blocks, className }: LessonBlockNoteViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editor = useCreateBlockNote(
    {
      initialContent: blocks,
    },
    [blocks],
  );

  useEffect(() => {
    editor.isEditable = false;
  }, [editor]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const applyPlaybackAttrs = () => {
      for (const video of root.querySelectorAll("video")) {
        video.setAttribute("playsinline", "");
        video.setAttribute("webkit-playsinline", "");
        if (!video.getAttribute("preload")) {
          video.setAttribute("preload", "metadata");
        }
      }
    };

    applyPlaybackAttrs();
    const observer = new MutationObserver(applyPlaybackAttrs);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [blocks]);

  return (
    <div
      ref={rootRef}
      className={["lesson-block-note-view", className].filter(Boolean).join(" ")}
    >
      <BlockNoteView
        editor={editor}
        editable={false}
        theme="light"
        sideMenu={false}
        formattingToolbar={false}
        linkToolbar={false}
        slashMenu={false}
        filePanel={false}
        tableHandles={false}
        emojiPicker={false}
      />
    </div>
  );
}
