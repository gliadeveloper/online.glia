import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export type ProfileUpdateInput = {
  name?: string;
  headline?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
};

function trimOrNull(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateMyProfile(userId: string, input: ProfileUpdateInput) {
  const name = input.name?.trim();
  const headline = trimOrNull(input.headline);
  const bio = trimOrNull(input.bio);
  const avatarUrl = trimOrNull(input.avatarUrl);

  if (name !== undefined && name.length === 0) {
    throw new ApiError("name is required", 400, "VALIDATION_ERROR");
  }

  if (name && name.length > 50) {
    throw new ApiError("name must be 50 characters or less", 400, "VALIDATION_ERROR");
  }

  if (headline && headline.length > 100) {
    throw new ApiError("headline must be 100 characters or less", 400, "VALIDATION_ERROR");
  }

  if (bio && bio.length > 500) {
    throw new ApiError("bio must be 500 characters or less", 400, "VALIDATION_ERROR");
  }

  if (avatarUrl) {
    try {
      const url = new URL(avatarUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("invalid protocol");
      }
    } catch {
      throw new ApiError("avatarUrl must be a valid http(s) URL", 400, "VALIDATION_ERROR");
    }
  }

  return prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({
        where: { id: userId },
        data: { name },
      });
    }

    await tx.profile.upsert({
      where: { userId },
      update: {
        ...(headline !== undefined ? { headline } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      },
      create: {
        userId,
        headline: headline ?? null,
        bio: bio ?? null,
        avatarUrl: avatarUrl ?? null,
      },
    });

    return tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        profile: {
          select: {
            headline: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    });
  });
}

export async function getMyProfileForEdit(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      emailKind: true,
      profile: {
        select: {
          headline: true,
          bio: true,
          avatarUrl: true,
        },
      },
    },
  });
}
