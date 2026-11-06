// The host photo is a private Storage file served by the
// `/avatars/$ownerId/$file` route, so it works in the local preview too.
// D1 keeps only its key (`avatars/<ownerId>/<id>.<ext>`), which is also the
// path of that route.
export function avatarUrl(
  key: string | null,
  fallback: string | null | undefined,
) {
  return key ? `/${key}` : (fallback ?? null);
}
