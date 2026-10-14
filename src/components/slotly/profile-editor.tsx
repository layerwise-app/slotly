import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { saveProfile } from "~/lib/scheduling.functions";
import { initials } from "./brand";
import { PageHeader, errorMessage } from "./shared";
import { useWorkspace } from "./workspace-context";

export function ProfileEditor() {
  const { data, name, profile, events, demo, gate, refresh } = useWorkspace();
  const [handle, setHandle] = useState(profile.handle);
  const [bio, setBio] = useState(profile.bio);
  const valid = /^[a-z0-9][a-z0-9-]{2,49}$/.test(handle);
  const dirty = handle !== profile.handle || bio !== profile.bio;
  const save = useMutation({
    mutationFn: () => saveProfile({ data: { ...profile, handle, bio } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Profile saved");
    },
  });
  const firstActive = events.find((event) => event.active);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-3xl gap-4">
        <Card className="ring-border">
          <CardHeader>
            <CardTitle className="font-semibold">Booking profile</CardTitle>
            <CardDescription>Shown on every booking page.</CardDescription>
          </CardHeader>
          <form
            id="profile-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (demo) gate();
              else save.mutate();
            }}
          >
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-handle">Username</Label>
                <div className="flex h-9 items-center overflow-hidden rounded-md border border-input bg-card shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-destructive">
                  <span className="flex h-full items-center border-r bg-muted px-3 text-sm text-muted-foreground">/book/</span>
                  <input
                    id="profile-handle"
                    required
                    maxLength={50}
                    autoComplete="off"
                    aria-invalid={!valid || undefined}
                    aria-describedby="profile-handle-hint"
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase())}
                  />
                </div>
                <p id="profile-handle-hint" className={valid ? "text-sm text-muted-foreground" : "text-sm text-destructive"}>
                  3–50 lowercase letters, numbers, or hyphens. Changing it breaks links you've already shared.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="profile-bio">Bio</Label>
                <Textarea
                  id="profile-bio"
                  rows={4}
                  maxLength={1000}
                  placeholder="A sentence about you or what you meet about"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
                <p className="text-right text-xs text-muted-foreground tabular-nums">{bio.length}/1000</p>
              </div>
              {save.error && (
                <p role="alert" className="text-sm text-destructive">
                  {errorMessage(save.error)}
                </p>
              )}
            </CardContent>
          </form>
          <CardFooter className="justify-between gap-2 border-t">
            {firstActive && !demo ? (
              <Button variant="link" className="px-0" asChild>
                <a href={`/book/${profile.handle}/${firstActive.slug}`} target="_blank" rel="noreferrer">
                  View booking page
                  <ExternalLink />
                </a>
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" form="profile-form" disabled={!dirty || !valid || save.isPending}>
              {save.isPending && <Spinner />}
              Save profile
            </Button>
          </CardFooter>
        </Card>
        <Card className="ring-border">
          <CardHeader>
            <CardTitle className="font-semibold">Account</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {data?.user.image ? (
              <img src={data.user.image} alt="" className="size-12 rounded-full object-cover" />
            ) : (
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-ink font-heading text-sm font-semibold text-white">
                {initials(name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{name}</p>
              <p className="truncate text-sm text-muted-foreground">{data?.user.email ?? "Demo workspace"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
