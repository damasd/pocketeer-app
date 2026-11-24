"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ScanFace } from "lucide-react";
import { PinPad } from "@/components/pin-pad";
import { COVER_ATTR, clearLock, nextTryAt, unlockWithBiometric, unlockWithPin, useAppLock } from "@/lib/app-lock";
import { biometricName } from "@/lib/biometric";
import { signOut } from "@/lib/profile";
import { STATUS_BAR, setStatusBarColour } from "@/lib/status-bar";

/**
 * The PIN / Face ID screen shown over the whole app while it is locked. Not shown on the
 * sign-in page (nothing to protect there yet).
 */
export function LockScreen() {
  const lock = useAppLock();
  const pathname = usePathname();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [now, setNow] = useState(0); // set in the browser (no clock during prerender)
  const triedFaceId = useRef(false);

  const onLogin = pathname === "/login";
  const show = lock.ready && lock.locked && !onLogin;

  // On the sign-in page the page must not stay covered.
  useEffect(() => {
    if (onLogin) document.documentElement.removeAttribute(COVER_ATTR);
  }, [onLogin]);

  // Black band behind the iPhone status bar while locked; the page's own colour once unlocked.
  useEffect(() => {
    if (!lock.ready) return;
    setStatusBarColour(show ? STATUS_BAR.dark : null);
  }, [show, lock.ready]);

  // Count down a wait after too many wrong PINs.
  const waitUntil = show ? nextTryAt() : null;
  useEffect(() => {
    if (!waitUntil) return;
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [waitUntil]);
  const waitSeconds = waitUntil ? Math.max(0, Math.ceil((waitUntil - now) / 1000)) : 0;

  // Offer Face ID as soon as the lock screen appears (the PIN stays as the fallback).
  useEffect(() => {
    if (!show) {
      triedFaceId.current = false;
      return;
    }
    if (triedFaceId.current || !lock.config?.credentialId) return;
    triedFaceId.current = true;
    unlockWithBiometric();
  }, [show, lock.config?.credentialId]);

  if (!show) return null;

  async function onPin(pin: string) {
    const result = await unlockWithPin(pin);
    if (result === "ok") {
      setMessage(null);
      return;
    }
    setIsError(true);
    setNow(Date.now());
    setMessage(result === "wait" ? "Too many tries. Wait a moment." : "Wrong PIN. Try again.");
  }

  async function forgot() {
    await signOut();
    clearLock();
    router.replace("/login");
    router.refresh();
  }

  const faceKey = lock.config?.credentialId ? (
    <button
      type="button"
      aria-label={`Unlock with ${biometricName()}`}
      onClick={async () => {
        const ok = await unlockWithBiometric();
        if (!ok) {
          setIsError(false);
          setMessage(`${biometricName()} didn't unlock. Use your PIN.`);
        }
      }}
      className="flex size-16 items-center justify-center rounded-full text-lime"
    >
      <ScanFace aria-hidden size={30} strokeWidth={1.75} />
    </button>
  ) : null;

  return (
    <div
      id="app-lock-root"
      role="dialog"
      aria-modal="true"
      aria-label="Pocketeer is locked"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between overflow-y-auto bg-ink px-6 pt-[max(56px,env(safe-area-inset-top))] pb-[max(28px,env(safe-area-inset-bottom))] text-white"
    >
      <div className="flex flex-col items-center gap-3">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-lime text-ink">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <h1 className="text-xl font-bold tracking-[-0.02em]">Pocketeer</h1>
      </div>

      <PinPad
        tone="dark"
        title="Enter your PIN"
        message={waitSeconds > 0 ? `Too many tries. Try again in ${waitSeconds} s.` : message}
        error={waitSeconds > 0 || isError}
        disabled={waitSeconds > 0}
        leftKey={faceKey}
        onComplete={onPin}
      />

      <button type="button" onClick={forgot} className="flex h-11 items-center px-3 text-[13px] font-semibold text-[#BDBDBD] underline-offset-4 hover:underline">
        Forgot PIN? Sign out
      </button>
    </div>
  );
}
