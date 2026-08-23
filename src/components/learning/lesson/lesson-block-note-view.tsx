"use client";

import type { Block } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useEffect } from "react";

import "./lesson-block-editor.css";
import "./lesson-block-note-view.css";

type LessonBlockNoteViewProps = {
  blocks: Block[];
  className?: string;
};

/** Read-only default BlockNote view (same blocks as editor). */
export function LessonBlockNoteView({ blocks, className }: LessonBlockNoteViewProps) {
  const editor = useCreateBlockNote(
    {
      initialContent: blocks,
    },
    [blocks],
  );

  useEffect(() => {
    editor.isEditable = false;
  }, [editor]);

  return (
    <div className={["lesson-block-note-view", className].filter(Boolean).join(" ")}>
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
