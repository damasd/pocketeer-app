"use client";

import Link from "next/link";
import { SubHeader } from "@/components/screen";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  ChevronRight,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/avatar";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { clearLock } from "@/lib/app-lock";
import { resetAccounts } from "@/lib/accounts";
import { resetCategories } from "@/lib/categories";
import { resetTransactions } from "@/lib/transactions";
import { resetBudgets } from "@/lib/budgets";
import { resetGoals } from "@/lib/goals";
import { resetHomeTiles } from "@/lib/home-tiles";
import { resetPeriods } from "@/lib/periods-store";
import {
  NAME_MAX,
  errorMessage,
  removePhoto,
  saveDisplayName,
  savePhoto,
  signOut,
  useProfile,
} from "@/lib/profile";

export function ProfileSettings() {
  const router = useRouter();
  const state = useProfile();
  const profile = state.profile;
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [name, setName] = useState<string | null>(null); // null = untouched, show saved name
  const [busy, setBusy] = useState<"name" | "photo" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const shownName = name ?? profile?.displayName ?? "";
  const dirty =
    profile != null && name != null && name.trim() !== profile.displayName;
  const ready = state.status === "ready";

  async function run(
    kind: "name" | "photo" | "signout",
    task: () => Promise<void>,
  ) {
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
    if (cameraRef.current) cameraRef.current.value = "";
    if (file) await run("photo", () => savePhoto(file));
  }

  // Photo menu: closes on Escape or a tap outside it.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && setMenuOpen(false);
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [menuOpen]);

  function pick(action: "camera" | "library" | "remove") {
    setMenuOpen(false);
    if (action === "camera") cameraRef.current?.click();
    else if (action === "library") fileRef.current?.click();
    else run("photo", removePhoto);
  }

  async function onSignOut() {
    if (await run("signout", signOut)) {
      clearLock();
      resetAccounts();
      resetCategories();
      resetTransactions();
      resetPeriods();
      resetBudgets();
      resetGoals();
      resetHomeTiles();
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SubHeader title="Settings" back="/" backLabel="Back to Home" />

      <section
        aria-labelledby="profile-title"
        className="flex flex-col gap-6 rounded-card bg-card p-5"
      >
        <h2 id="profile-title" className="text-heading font-semibold">
          Profile
        </h2>

        <div className="flex items-center gap-4">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              disabled={!ready || busy !== null}
              aria-label="Change profile photo"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="relative rounded-full disabled:opacity-60"
            >
              {profile ? (
                <Avatar
                  name={shownName || profile.displayName}
                  photoUrl={profile.photoUrl}
                  size={72}
                />
              ) : (
                <span
                  aria-hidden
                  className="block size-[72px] rounded-full bg-line"
                />
              )}
              <span
                aria-hidden
                className="absolute -right-0.5 -bottom-0.5 flex size-7 items-center justify-center rounded-full bg-ink text-card ring-2 ring-card"
              >
                <Camera size={15} strokeWidth={2.25} />
              </span>
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Profile photo"
                className="absolute top-full left-0 z-10 mt-2 w-52 overflow-hidden rounded-tile bg-card py-1 shadow-[0_12px_32px_rgba(17,17,17,0.18)] ring-1 ring-line"
              >
                <MenuItem
                  icon={<Camera aria-hidden size={18} strokeWidth={2} />}
                  onSelect={() => pick("camera")}
                >
                  Take photo
                </MenuItem>
                <MenuItem
                  icon={<ImageIcon aria-hidden size={18} strokeWidth={2} />}
                  onSelect={() => pick("library")}
                >
                  Choose photo
                </MenuItem>
                {profile?.photoPath && (
                  <MenuItem
                    icon={<Trash2 aria-hidden size={18} strokeWidth={2} />}
                    onSelect={() => pick("remove")}
                  >
                    Remove photo
                  </MenuItem>
                )}
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body font-semibold">
              {busy === "photo" ? "Updating photo…" : "Profile photo"}
            </span>
            <span className="truncate text-meta font-medium text-muted">
              {profile?.email ?? " "}
            </span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onPhoto(e.target.files?.[0])}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="user"
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
          {saved && (
            <p
              aria-live="polite"
              className="text-meta font-medium text-muted"
            >
              Saved. Home shows the new name.
            </p>
          )}
        </form>

        {(error || state.status === "error") && (
          <ErrorNote>
            {error ?? (state.status === "error" ? state.message : "")}
          </ErrorNote>
        )}
      </section>

      <nav
        aria-label="Manage"
        className="flex flex-col overflow-hidden rounded-card bg-card"
      >
        {[
          {
            href: "/account",
            label: "Accounts",
            hint: "Add, rename, recolour or archive",
          },
          {
            href: "/settings/categories",
            label: "Categories",
            hint: "Expense, income and saving lists",
          },
          {
            href: "/settings/security",
            label: "Security",
            hint: "PIN, Face ID and hidden amounts",
          },
          {
            href: "/settings/export",
            label: "Export",
            hint: "Download transactions as .xlsx or .csv",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-16 items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-0"
          >
            <span className="flex flex-col">
              <span className="text-body font-semibold">{item.label}</span>
              <span className="text-meta font-medium text-muted">
                {item.hint}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              size={20}
              className="flex-none text-muted"
            />
          </Link>
        ))}
      </nav>

      <Button variant="secondary" onClick={onSignOut} disabled={busy !== null}>
        {busy === "signout" ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}

function MenuItem({
  icon,
  onSelect,
  children,
}: {
  icon: React.ReactNode;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-body font-semibold hover:bg-page focus-visible:bg-page"
    >
      {icon}
      {children}
    </button>
  );
}
