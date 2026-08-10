import { assertCoach, ApiError, jsonError, resolveUserId } from "@/lib/api";
import { parseCoachingImageUploadForm } from "@/lib/media/coaching-image-upload-route";
import { uploadCoachingImageBuffer } from "@/lib/media/r2-image-upload";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const userId = await resolveUserId(request);
    await assertCoach(userId);

    const payload = await parseCoachingImageUploadForm(request);

    const session = await prisma.coachingSession.findFirst({
      where: { id: payload.sessionId, coachId: userId },
      select: { id: true },
    });

    if (!session) {
      throw new ApiError("Coaching session not found", 404, "SESSION_NOT_FOUND");
    }

    const uploaded = await uploadCoachingImageBuffer(payload);
    return Response.json(uploaded);
  } catch (error) {
    return jsonError(error);
  }
}
