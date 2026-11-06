import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { db } from "~/db";
import { schedulingProfile } from "~/db/schema";

// Serves a host's current photo. Only keys saved on a profile are readable;
// each upload gets a new key, so responses can be cached for good.
export const Route = createFileRoute("/avatars/$ownerId/$file")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = `avatars/${params.ownerId}/${params.file}`;
        const current = await db
          .select({ ownerId: schedulingProfile.ownerId })
          .from(schedulingProfile)
          .where(
            and(
              eq(schedulingProfile.ownerId, params.ownerId),
              eq(schedulingProfile.avatarKey, key),
            ),
          );
        const file = current.length ? await env.STORAGE.get(key) : null;
        if (!file) return new Response("Not found", { status: 404 });
        return new Response(file.body, {
          headers: {
            "content-type": file.contentType,
            "content-length": String(file.size),
            "cache-control": "public, max-age=31536000, immutable",
            "x-content-type-options": "nosniff",
          },
        });
      },
    },
  },
});
