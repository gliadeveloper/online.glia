/** Client-safe limits and display helpers shared by browser upload + API routes. */

export type LessonMaterialPublic = {
  id: string;
  title: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  sortOrder: number;
};

export const MAX_LESSON_MATERIAL_BYTES = 20 * 1024 * 1024;
export const MAX_LESSON_MATERIALS = 20;

export const LESSON_MATERIAL_EXT_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  zip: "application/zip",
  txt: "text/plain",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const ALLOWED_LESSON_MATERIAL_TYPES = new Set([
  ...Object.values(LESSON_MATERIAL_EXT_TO_MIME),
  "application/x-zip-compressed",
]);

export const LESSON_MATERIAL_ACCEPT = [
  ".pdf",
  ".ppt",
  ".pptx",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ...ALLOWED_LESSON_MATERIAL_TYPES,
].join(",");

const TYPE_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "text/plain": "TXT",
  "image/jpeg": "이미지",
  "image/png": "이미지",
  "image/webp": "이미지",
};

export function fileExtension(fileName: string) {
  const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function lessonMaterialTypeLabel(contentType: string, fileName?: string) {
  const fromMime = TYPE_LABELS[contentType.trim().toLowerCase()];
  if (fromMime) return fromMime;
  const ext = fileName ? fileExtension(fileName).toUpperCase() : "";
  return ext || "파일";
}

export function formatLessonMaterialSize(byteSize: number) {
  if (byteSize < 1024) return `${byteSize} B`;
  if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(1)} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}
