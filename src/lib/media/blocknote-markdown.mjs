import { BlockNoteEditor, blocksToMarkdown } from "@blocknote/core";
import { JSDOM } from "jsdom";

// Default-schema serialization only: no React custom blocks, collaboration,
// external resources, scripts, or asynchronous work while globals are installed.
// Core 0.53 exports the same converter used by its client ExportManager.
const editor = BlockNoteEditor.create();

export function serializeDefaultBlocks(blocks) {
  const dom = new JSDOM();
  const previous = { window: Object.getOwnPropertyDescriptor(globalThis, "window"), document: Object.getOwnPropertyDescriptor(globalThis, "document") };
  try {
    Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true, writable: true });
    Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true, writable: true });
    return blocksToMarkdown(blocks, editor.pmSchema, editor, { document: dom.window.document });
  } finally {
    for (const key of ["window", "document"]) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]);
      else delete globalThis[key];
    }
    dom.window.close();
  }
}
