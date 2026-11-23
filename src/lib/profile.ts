"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/errors";

export { errorMessage };

export type Profile = {
  userId: string;
  email: string;
  displayName: string;
  photoPath: string | null;
  /** Signed URL for the private photo, or null when there is no photo. */
  photoUrl: string | null;
  photoUrlExpires: number;
};

type State =
  | { status: "loading"; profile: Profile | null }
  | { status: "ready"; profile: Profile }
  | { status: "error"; profile: Profile | null; message: string };

const BUCKET = "avatars";
const SIGNED_URL_SECONDS = 60 * 60 * 24;
const CACHE_KEY = "money.profile.v1";
export const NAME_MAX = 40;

// ---- store -----------------------------------------------------------------

let state: State = { status: "loading", profile: null };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  if (next.profile) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(next.profile));
    } catch {}
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;
const SERVER_STATE: State = { status: "loading", profile: null };
const getServerSnapshot = (): State => SERVER_STATE;

/** Last known profile from this device, so the greeting shows instantly on reopen. */
function readCache(): Profile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    if (p.photoUrl && p.photoUrlExpires < Date.now()) p.photoUrl = null;
    return p;
  } catch {
    return null;
  }
}

async function signedUrl(path: string | null) {
  if (!path) return { photoUrl: null, photoUrlExpires: 0 };
  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error) throw error;
  // Refresh a little before Supabase's expiry.
  return { photoUrl: data.signedUrl, photoUrlExpires: Date.now() + (SIGNED_URL_SECONDS - 300) * 1000 };
}

async function load() {
  const cached = state.profile ?? readCache();
  if (cached && state.status === "loading") set({ status: "loading", profile: cached });

  let fallback: Profile | null = cached;
  try {
    const { data: auth } = await supabase().auth.getSession();
    const user = auth.session?.user;
    if (!user) throw new Error("Not signed in");
    // If the profile row can't be read, still greet with the email name.
    fallback ??= {
      userId: user.id,
      email: user.email ?? "",
      displayName: (user.email ?? "").split("@")[0],
      photoPath: null,
      photoUrl: null,
      photoUrlExpires: 0,
    };

    const { data: row, error } = await supabase()
      .from("profiles")
      .select("display_name, photo_path")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;

    const photoPath: string | null = row?.photo_path ?? null;
    const photo =
      cached && cached.userId === user.id && cached.photoPath === photoPath && cached.photoUrl
        ? { photoUrl: cached.photoUrl, photoUrlExpires: cached.photoUrlExpires }
        : await signedUrl(photoPath);

    set({
      status: "ready",
      profile: {
        userId: user.id,
        email: user.email ?? "",
        displayName: row?.display_name || (user.email ?? "").split("@")[0],
        photoPath,
        ...photo,
      },
    });
  } catch (e) {
    set({ status: "error", profile: fallback, message: errorMessage(e, "Could not load profile") });
  }
}

function ensureLoaded() {
  loading ??= load().finally(() => {
    if (state.status === "error") loading = null;
  });
}

/** Current user's profile. Loads once per tab; later screens reuse it. */
export function useProfile(): State {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(ensureLoaded, []);
  return s;
}

function current(): Profile {
  if (!state.profile || state.status !== "ready") throw new Error("Profile not loaded yet");
  return state.profile;
}

// ---- mutations -------------------------------------------------------------

export async function saveDisplayName(name: string) {
  const p = current();
  const displayName = name.trim().slice(0, NAME_MAX);
  if (!displayName) throw new Error("Name can't be empty");
  const { error } = await supabase()
    .from("profiles")
    .upsert({ user_id: p.userId, display_name: displayName, updated_at: new Date().toISOString() });
  if (error) throw error;
  set({ status: "ready", profile: { ...p, displayName } });
}

/** Crop to a centred square, shrink to 512 px and re-encode as JPEG before upload. */
async function shrinkPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const size = Math.min(512, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read this photo");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not read this photo"))), "image/jpeg", 0.85),
  );
}

export async function savePhoto(file: File) {
  const p = current();
  const blob = await shrinkPhoto(file);
  const path = `${p.userId}/${Date.now()}.jpg`;

  const { error: upErr } = await supabase().storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (upErr) throw upErr;

  const { error: dbErr } = await supabase()
    .from("profiles")
    .upsert({ user_id: p.userId, display_name: p.displayName, photo_path: path, updated_at: new Date().toISOString() });
  if (dbErr) {
    await supabase().storage.from(BUCKET).remove([path]);
    throw dbErr;
  }

  if (p.photoPath) await supabase().storage.from(BUCKET).remove([p.photoPath]);
  set({ status: "ready", profile: { ...p, photoPath: path, ...(await signedUrl(path)) } });
}

export async function signOut() {
  await supabase().auth.signOut();
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
  state = { status: "loading", profile: null };
  loading = null;
}
