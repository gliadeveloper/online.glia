import { ApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { getEnrollmentAccessState } from "@/lib/learning";
import {
  ALLOWED_LESSON_MATERIAL_TYPES,
  fileExtension,
  LESSON_MATERIAL_EXT_TO_MIME,
  MAX_LESSON_MATERIAL_BYTES,
  MAX_LESSON_MATERIALS,
  type LessonMaterialPublic,
} from "@/lib/lesson-material-constants";

export type { LessonMaterialPublic };
import { buildLessonMaterialObjectKey } from "@/lib/media/content-metadata";
import { deleteR2Object, putR2Object, requireR2Config } from "@/lib/media/r2";
import { prisma } from "@/lib/prisma";

export const lessonMaterialPublicSelect = {
  id: true,
  title: true,
  originalName: true,
  contentType: true,
  byteSize: true,
  sortOrder: true,
} as const;

function sanitizeOriginalName(fileName: string) {
  const base = fileName.split(/[/\\]/).pop()?.trim() || "file";
  return base.slice(0, 180);
}

function titleFromFileName(fileName: string) {
  const base = sanitizeOriginalName(fileName);
  return base.replace(/\.[a-z0-9]+$/i, "") || base;
}

export function resolveLessonMaterialContentType(fileName: string, contentType: string) {
  const ext = fileExtension(fileName);
  const fromExt = ext ? LESSON_MATERIAL_EXT_TO_MIME[ext] : undefined;
  const normalized = contentType.trim().toLowerCase();

  if (!fromExt) {
    throw new ApiError(
      "PDF, PPT, Word, Excel, ZIP, 이미지, 텍스트 파일만 업로드할 수 있습니다.",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (
    normalized &&
    normalized !== "application/octet-stream" &&
    !ALLOWED_LESSON_MATERIAL_TYPES.has(normalized)
  ) {
    throw new ApiError(
      "PDF, PPT, Word, Excel, ZIP, 이미지, 텍스트 파일만 업로드할 수 있습니다.",
      400,
      "VALIDATION_ERROR",
    );
  }

  if (normalized && ALLOWED_LESSON_MATERIAL_TYPES.has(normalized)) {
    return normalized;
  }

  return fromExt;
}

export function serializeLessonMaterial(material: LessonMaterialPublic): LessonMaterialPublic {
  return {
    id: material.id,
    title: material.title,
    originalName: material.originalName,
    contentType: material.contentType,
    byteSize: material.byteSize,
    sortOrder: material.sortOrder,
  };
}

export function buildMaterialContentDisposition(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "") || "download";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function assertCanDownloadLessonMaterial(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: {
        select: {
          courseId: true,
          course: { select: { instructorId: true } },
        },
      },
    },
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new ApiError("Login required", 401, "UNAUTHORIZED");
  }

  if (user.role === "ADMIN") {
    return lesson;
  }

  if (user.role === "COACH" && lesson.module.course.instructorId === userId) {
    return lesson;
  }

  const state = await getEnrollmentAccessState(userId, lesson.module.courseId);
  if (state.kind === "expired") {
    throw new ApiError("Enrollment access expired", 403, "ENROLLMENT_EXPIRED");
  }
  if (state.kind !== "active") {
    throw new ApiError("Lesson access denied", 403, "FORBIDDEN");
  }

  return lesson;
}

export async function readLessonMaterialUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || file.size <= 0) {
    throw new ApiError("수업자료 파일을 선택해 주세요.", 400, "VALIDATION_ERROR");
  }

  if (file.size > MAX_LESSON_MATERIAL_BYTES) {
    throw new ApiError("수업자료는 20MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  const title = String(formData.get("title") ?? "").trim();
  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    title,
    fileName: file.name || "file",
    contentType: file.type.trim() || "application/octet-stream",
    buffer,
  };
}

export async function createLessonMaterial(params: {
  actorId: string;
  lessonId: string;
  title?: string;
  fileName: string;
  contentType: string;
  buffer: Buffer;
}) {
  if (params.buffer.byteLength > MAX_LESSON_MATERIAL_BYTES) {
    throw new ApiError("수업자료는 20MB 이하만 업로드할 수 있습니다.", 400, "VALIDATION_ERROR");
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: params.lessonId },
    select: {
      id: true,
      module: { select: { courseId: true } },
    },
  });

  if (!lesson) {
    throw new ApiError("Lesson not found", 404, "LESSON_NOT_FOUND");
  }

  const count = await prisma.lessonMaterial.count({ where: { lessonId: params.lessonId } });
  if (count >= MAX_LESSON_MATERIALS) {
    throw new ApiError(`수업자료는 레슨당 ${MAX_LESSON_MATERIALS}개까지 등록할 수 있습니다.`, 400, "VALIDATION_ERROR");
  }

  requireR2Config();

  const originalName = sanitizeOriginalName(params.fileName);
  const contentType = resolveLessonMaterialContentType(originalName, params.contentType);
  const title = params.title?.trim() || titleFromFileName(originalName);
  const materialId = crypto.randomUUID();
  const objectKey = buildLessonMaterialObjectKey({
    courseId: lesson.module.courseId,
    lessonId: params.lessonId,
    materialId,
    fileName: originalName,
  });

  await putR2Object({
    objectKey,
    contentType,
    body: params.buffer,
  });

  try {
    const maxOrder = await prisma.lessonMaterial.aggregate({
      where: { lessonId: params.lessonId },
      _max: { sortOrder: true },
    });

    const material = await prisma.lessonMaterial.create({
      data: {
        id: materialId,
        lessonId: params.lessonId,
        title,
        originalName,
        contentType,
        byteSize: params.buffer.byteLength,
        objectKey,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
      select: lessonMaterialPublicSelect,
    });

    await writeAuditLog({
      actorId: params.actorId,
      entityType: "LessonMaterial",
      entityId: material.id,
      action: "LESSON_MATERIAL_CREATED",
      metadata: { lessonId: params.lessonId, originalName, byteSize: material.byteSize },
    });

    return serializeLessonMaterial(material);
  } catch (error) {
    await deleteR2Object(objectKey).catch(() => undefined);
    throw error;
  }
}

export async function deleteLessonMaterial(params: { actorId: string; materialId: string }) {
  const material = await prisma.lessonMaterial.findUnique({
    where: { id: params.materialId },
  });

  if (!material) {
    throw new ApiError("Material not found", 404, "MATERIAL_NOT_FOUND");
  }

  await prisma.lessonMaterial.delete({ where: { id: material.id } });

  await writeAuditLog({
    actorId: params.actorId,
    entityType: "LessonMaterial",
    entityId: material.id,
    action: "LESSON_MATERIAL_DELETED",
    metadata: { lessonId: material.lessonId, originalName: material.originalName },
  });

  try {
    await deleteR2Object(material.objectKey);
  } catch (error) {
    console.error("Failed to delete lesson material object", material.objectKey, error);
  }

  return { ok: true, lessonId: material.lessonId };
}

export async function getLessonMaterialForDownload(params: { lessonId: string; materialId: string }) {
  const material = await prisma.lessonMaterial.findFirst({
    where: { id: params.materialId, lessonId: params.lessonId },
  });

  if (!material) {
    throw new ApiError("Material not found", 404, "MATERIAL_NOT_FOUND");
  }

  return material;
}
