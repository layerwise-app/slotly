import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { schedulingProfile } from "~/db/schema";
import { requireOwner, saveSafely } from "~/lib/server-input";
import { getStorageErrorCode } from "~/lib/storage";

const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
export const AVATAR_ACCEPT = Object.keys(AVATAR_TYPES).join(",");
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

async function currentAvatarKey(ownerId: string) {
  const rows = await db
    .select({ avatarKey: schedulingProfile.avatarKey })
    .from(schedulingProfile)
    .where(eq(schedulingProfile.ownerId, ownerId));
  if (!rows[0]) throw new Error("Open your dashboard once, then try again.");
  return rows[0].avatarKey;
}

async function setAvatarKey(ownerId: string, avatarKey: string | null) {
  await saveSafely(
    db
      .update(schedulingProfile)
      .set({ avatarKey })
      .where(eq(schedulingProfile.ownerId, ownerId)),
  );
}

// The old photo is already unlinked; a failed cleanup only leaves a stray file.
async function deleteOldAvatar(key: string | null) {
  if (!key) return;
  try {
    await env.STORAGE.delete(key);
  } catch (error) {
    console.warn(
      "Slotly could not delete an old photo",
      error instanceof Error ? error.message : error,
    );
  }
}

// Browser: const form = new FormData(); form.set("file", file);
export const uploadAvatar = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    const file = data instanceof FormData ? data.get("file") : null;
    if (!(file instanceof File)) throw new Error("Choose a photo.");
    if (!AVATAR_TYPES[file.type])
      throw new Error("Use a JPEG, PNG, WebP, or GIF image.");
    if (file.size > MAX_AVATAR_BYTES)
      throw new Error("Use a photo under 2 MB.");
    return file;
  })
  .handler(async ({ data: file }) => {
    const owner = await requireOwner();
    const previous = await currentAvatarKey(owner.id);
    // Photo URLs are cached for good, so every version gets a new key. The
    // file stays private; `/avatars/$ownerId/$file` serves the current one.
    const key = `avatars/${owner.id}/${crypto.randomUUID()}.${AVATAR_TYPES[file.type]}`;
    try {
      await env.STORAGE.put(key, file.stream(), {
        size: file.size,
        contentType: file.type,
      });
    } catch (error) {
      const code = getStorageErrorCode(error);
      if (code === "StorageQuotaExceeded")
        throw new Error("Storage is full. Delete some files and try again.");
      if (code === "FileTooLarge") throw new Error("This photo is too large.");
      if (code === "BlockedContent")
        throw new Error("This photo can't be used. Choose another.");
      throw error;
    }
    await setAvatarKey(owner.id, key);
    await deleteOldAvatar(previous);
    return { success: true };
  });

export const removeAvatar = createServerFn({ method: "POST" }).handler(
  async () => {
    const owner = await requireOwner();
    const previous = await currentAvatarKey(owner.id);
    await setAvatarKey(owner.id, null);
    await deleteOldAvatar(previous);
    return { success: true };
  },
);
