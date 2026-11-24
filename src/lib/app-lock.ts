"use client";

import { useSyncExternalStore } from "react";
import { verifyBiometric } from "@/lib/biometric";
import {
  COVER_ATTR,
  LOCK_CONFIG_KEY,
  PBKDF2_ITERATIONS,
  hashPin,
  lockoutUntil,
  newSalt,
  sameHash,
  shouldLockOnReturn,
} from "@/lib/lock-rules";

// The app lock's settings live on this device only (localStorage). The PIN is never stored,
// only its salted hash. Signing out removes them.

export type LockConfig = {
  v: 1;
  salt: string;
  hash: string;
  iterations: number;
  credentialId: string | null; // Face ID credential on this device
  lockAfterMs: number;
};

type Attempts = { failed: number; lastFailAt: number };

export type LockState = {
  ready: boolean; // false until read in the browser
  config: LockConfig | null;
  locked: boolean;
  attempts: Attempts;
};

const CONFIG_KEY = LOCK_CONFIG_KEY;
const ATTEMPTS_KEY = "pocketeer.lock.attempts.v1";
export { COVER_ATTR };

let state: LockState = { ready: false, config: null, locked: false, attempts: { failed: 0, lastFailAt: 0 } };
const listeners = new Set<() => void>();
const emit = (next: Partial<LockState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function cover(on: boolean) {
  if (on) document.documentElement.setAttribute(COVER_ATTR, "");
  else document.documentElement.removeAttribute(COVER_ATTR);
}

/** Lock now: close any open sheet so nothing shows over the lock screen. */
function lockNow() {
  document.querySelectorAll("dialog[open]").forEach((d) => (d as HTMLDialogElement).close());
  cover(true);
  emit({ locked: true });
  lockListeners.forEach((l) => l());
}

/** Called when the app locks (amounts go back to hidden). */
const lockListeners = new Set<() => void>();
export function onLock(listener: () => void) {
  lockListeners.add(listener);
  return () => lockListeners.delete(listener);
}

let hiddenAt: number | null = null;
let started = false;

/** Read the settings once in the browser and watch the app going to and from the background. */
function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const config = read<LockConfig>(CONFIG_KEY);
  const attempts = read<Attempts>(ATTEMPTS_KEY) ?? { failed: 0, lastFailAt: 0 };
  emit({ ready: true, config, attempts, locked: Boolean(config) });
  if (!config) cover(false);

  document.addEventListener("visibilitychange", () => {
    if (!state.config) return;
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      cover(true); // the app switcher shows a covered screen, not your numbers
    } else {
      if (shouldLockOnReturn(hiddenAt, Date.now(), state.config.lockAfterMs)) lockNow();
      else if (!state.locked) cover(false);
      hiddenAt = null;
    }
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  start();
  return () => listeners.delete(l);
};
const SERVER: LockState = { ready: false, config: null, locked: false, attempts: { failed: 0, lastFailAt: 0 } };

export function useAppLock(): LockState {
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

function unlock() {
  write(ATTEMPTS_KEY, null);
  cover(false);
  emit({ locked: false, attempts: { failed: 0, lastFailAt: 0 } });
}

/** Next allowed PIN try (ms since epoch), or null when a try is allowed now. */
export function nextTryAt(): number | null {
  const until = lockoutUntil(state.attempts.failed, state.attempts.lastFailAt);
  return until !== null && until > Date.now() ? until : null;
}

/** Check a PIN against the saved hash. */
export async function checkPin(pin: string): Promise<boolean> {
  const c = state.config;
  if (!c) return false;
  return sameHash(await hashPin(pin, c.salt, c.iterations), c.hash);
}

/** Unlock with the PIN. Wrong PINs count toward the wait. */
export async function unlockWithPin(pin: string): Promise<"ok" | "wrong" | "wait"> {
  if (nextTryAt()) return "wait";
  if (await checkPin(pin)) {
    unlock();
    return "ok";
  }
  const attempts = { failed: state.attempts.failed + 1, lastFailAt: Date.now() };
  write(ATTEMPTS_KEY, attempts);
  emit({ attempts });
  return "wrong";
}

/** Unlock with Face ID, when it is set up. */
export async function unlockWithBiometric(): Promise<boolean> {
  const id = state.config?.credentialId;
  if (!id) return false;
  const ok = await verifyBiometric(id);
  if (ok) unlock();
  return ok;
}

// ---- settings ----------------------------------------------------------------------------

function save(config: LockConfig | null) {
  write(CONFIG_KEY, config);
  emit({ config });
}

/** Turn the lock on with a new PIN (already checked with pinProblem). */
export async function enableLock(pin: string) {
  const salt = newSalt();
  save({ v: 1, salt, hash: await hashPin(pin, salt), iterations: PBKDF2_ITERATIONS, credentialId: null, lockAfterMs: 60_000 });
  emit({ locked: false });
}

export async function changePin(pin: string) {
  if (!state.config) return;
  const salt = newSalt();
  save({ ...state.config, salt, hash: await hashPin(pin, salt), iterations: PBKDF2_ITERATIONS });
}

export function setBiometric(credentialId: string | null) {
  if (state.config) save({ ...state.config, credentialId });
}

export function setLockAfter(ms: number) {
  if (state.config) save({ ...state.config, lockAfterMs: ms });
}

/** Turn the lock off (after the PIN was checked), or forget it on sign-out. */
export function clearLock() {
  save(null);
  write(ATTEMPTS_KEY, null);
  cover(false);
  emit({ locked: false, attempts: { failed: 0, lastFailAt: 0 } });
}

