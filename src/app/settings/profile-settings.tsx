"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { resetAccounts } from "@/lib/accounts";
import { resetCategories } from "@/lib/categories";
import { NAME_MAX, errorMessage, saveDisplayName, savePhoto, signOut, useProfile } from "@/lib/profile";

export function ProfileSettings() {
  const router = useRouter();
  const state = useProfile();
  const profile = state.profile;
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState<string | null>(null); // null = untouched, show saved name
  const [busy, setBusy] = useState<"name" | "photo" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const shownName = name ?? profile?.displayName ?? "";
  const dirty = profile != null && name != null && name.trim() !== profile.displayName;
  const ready = state.status === "ready";

  async function run(kind: "name" | "photo" | "signout", task: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    setSaved(false);
    try {
      await task();
      return true;
    } catch (e) {
      setError(errorMessage(e, "Something went wrong"));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function onSaveName(e: FormEvent) {
    e.preventDefault();
    if (await run("name", () => saveDisplayName(shownName))) {
      setName(null);
      setSaved(true);
    }
  }

  async function onPhoto(file: File | undefined) {
    if (fileRef.current) fileRef.current.value = "";
    if (file) await run("photo", () => savePhoto(file));
  }

  async function onSignOut() {
    if (await run("signout", signOut)) {
      resetAccounts();
      resetCategories();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-1 pt-3">
        <Link
          href="/"
          aria-label="Back to Home"
          className="-ml-2.5 flex size-11 items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden size={26} strokeWidth={2.25} />
        </Link>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Settings</h1>
      </header>

      <section aria-labelledby="profile-title" className="flex flex-col gap-6 rounded-3xl bg-card p-5">
        <h2 id="profile-title" className="text-[17px] font-semibold">
          Profile
        </h2>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={!ready || busy !== null}
            aria-label="Change profile photo"
            className="relative rounded-full disabled:opacity-60"
          >
            {profile ? (
              <Avatar name={shownName || profile.displayName} photoUrl={profile.photoUrl} size={72} />
            ) : (
              <span aria-hidden className="block size-[72px] rounded-full bg-line" />
            )}
            <span
              aria-hidden
              className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-ink text-white ring-2 ring-card"
            >
              <Camera size={15} strokeWidth={2.25} />
            </span>
          </button>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[15px] font-semibold">
              {busy === "photo" ? "Uploading photo…" : "Profile photo"}
            </span>
            <span className="truncate text-[13px] font-medium text-muted">{profile?.email ?? " "}</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
        </div>

        <form onSubmit={onSaveName} className="flex flex-col gap-2">
          <Label htmlFor="display-name">Name</Label>
          <div className="flex gap-2">
            <Input
              id="display-name"
              autoComplete="nickname"
              maxLength={NAME_MAX}
              required
              disabled={!ready}
              value={shownName}
              onChange={(e) => {
                setName(e.target.value);
                setSaved(false);
              }}
              className="bg-page"
            />
            <Button
              type="submit"
              size="md"
              disabled={!dirty || !shownName.trim() || busy !== null}
              className="flex-none"
            >
              {busy === "name" ? "Saving…" : "Save"}
            </Button>
          </div>
          <p aria-live="polite" className="min-h-5 text-[13px] font-medium text-muted">
            {saved ? "Saved. Home shows the new name." : "Shown on Home after “Welcome back,”"}
          </p>
        </form>

        {(error || state.status === "error") && (
          <ErrorNote>{error ?? (state.status === "error" ? state.message : "")}</ErrorNote>
        )}
      </section>

      <nav aria-label="Manage" className="flex flex-col overflow-hidden rounded-3xl bg-card">
        {[
          { href: "/account", label: "Accounts", hint: "Add, rename, recolour or archive" },
          { href: "/settings/categories", label: "Categories", hint: "Expense, income and saving lists" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-16 items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0"
          >
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold">{item.label}</span>
              <span className="text-[13px] font-medium text-muted">{item.hint}</span>
            </span>
            <ChevronRight aria-hidden size={20} className="flex-none text-muted" />
          </Link>
        ))}
      </nav>

      <Button variant="secondary" onClick={onSignOut} disabled={busy !== null}>
        {busy === "signout" ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
