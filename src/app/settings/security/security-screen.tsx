"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PinPad } from "@/components/pin-pad";
import { Segmented } from "@/components/segmented";
import { Sheet } from "@/components/sheet";
import { showToast } from "@/components/toast";
import { setHideByDefault, useAmounts } from "@/lib/amounts";
import { changePin, checkPin, clearLock, enableLock, setBiometric, setLockAfter, useAppLock } from "@/lib/app-lock";
import { biometricAvailable, biometricName, registerBiometric } from "@/lib/biometric";
import { errorMessage } from "@/lib/errors";
import { LOCK_AFTER_CHOICES, pinProblem } from "@/lib/lock-rules";

type Flow = "set" | "change" | "off";

/** Settings > Security: PIN, Face ID, when to lock, hidden amounts. */
export function SecurityScreen() {
  const lock = useAppLock();
  const amounts = useAmounts();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [bioOk, setBioOk] = useState<boolean | null>(null);
  const on = Boolean(lock.config);

  useEffect(() => {
    biometricAvailable().then(setBioOk);
  }, []);

  async function toggleBiometric() {
    if (!lock.config) return;
    if (lock.config.credentialId) {
      setBiometric(null);
      showToast({ message: `${biometricName()} turned off` });
      return;
    }
    try {
      setBiometric(await registerBiometric());
      showToast({ message: `${biometricName()} is on` });
    } catch (e) {
      showToast({ message: errorMessage(e, `${biometricName()} wasn't set up`), tone: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center gap-1 pt-3">
        <Link href="/settings" aria-label="Back to Settings" className="-ml-2.5 flex size-11 items-center justify-center rounded-full">
          <ChevronLeft aria-hidden size={26} strokeWidth={2.25} />
        </Link>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Security</h1>
      </header>

      <section aria-labelledby="lock-title" className="flex flex-col rounded-3xl bg-card">
        <h2 id="lock-title" className="px-5 pt-5 pb-1 text-[17px] font-semibold">
          App lock
        </h2>
        <p className="px-5 pb-2 text-[13px] font-medium text-muted">
          Asks for a PIN or {biometricName()} before Pocketeer opens on this device.
        </p>

        <Row
          label="Lock with PIN"
          hint={on ? "6-digit PIN set" : "Off"}
          control={<Switch checked={on} label="Lock with PIN" onChange={() => setFlow(on ? "off" : "set")} />}
        />

        {on && (
          <>
            <Row
              label={biometricName()}
              hint={
                bioOk === false
                  ? "Not available on this device or browser"
                  : lock.config?.credentialId
                    ? "On. The PIN still works"
                    : "Unlock without typing the PIN"
              }
              control={
                <Switch
                  checked={Boolean(lock.config?.credentialId)}
                  disabled={bioOk === false}
                  label={biometricName()}
                  onChange={toggleBiometric}
                />
              }
            />
            <button
              type="button"
              onClick={() => setFlow("change")}
              className="flex min-h-16 items-center justify-between gap-3 border-t border-line px-5 py-3 text-left"
            >
              <span className="text-[15px] font-semibold">Change PIN</span>
              <ChevronRight aria-hidden size={20} className="text-muted" />
            </button>
            <div className="flex flex-col gap-2 border-t border-line px-5 py-4">
              <span id="lock-after" className="text-[15px] font-semibold">
                Lock after leaving the app
              </span>
              <Segmented
                label="Lock after leaving the app"
                options={LOCK_AFTER_CHOICES.map((c) => ({ value: String(c.ms), label: c.label }))}
                value={String(lock.config?.lockAfterMs ?? 60_000)}
                onChange={(v) => setLockAfter(Number(v))}
              />
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="privacy-title" className="flex flex-col rounded-3xl bg-card">
        <h2 id="privacy-title" className="px-5 pt-5 pb-2 text-[17px] font-semibold">
          Privacy
        </h2>
        <Row
          label="Hide amounts on Home and Accounts"
          hint="Shows Rp •••••• until you tap the eye"
          control={
            <Switch
              checked={amounts.hideByDefault}
              label="Hide amounts on Home and Accounts"
              onChange={() => setHideByDefault(!amounts.hideByDefault)}
            />
          }
        />
      </section>

      <p className="px-1 text-xs font-medium text-muted">
        The PIN and {biometricName()} stay on this device. Forgot your PIN? Sign out on the lock screen and sign in again
        with your email code; then set a new PIN here.
      </p>

      <Sheet
        open={flow !== null}
        onClose={() => setFlow(null)}
        title={flow === "set" ? "Set a PIN" : flow === "change" ? "Change PIN" : "Turn off app lock"}
      >
        {flow && <PinFlow key={flow} flow={flow} onDone={() => setFlow(null)} />}
      </Sheet>
    </div>
  );
}

function Row({ label, hint, control }: { label: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 border-t border-line px-5 py-3 first-of-type:border-t-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-[15px] font-semibold">{label}</span>
        <span className="text-[13px] font-medium text-muted">{hint}</span>
      </span>
      {control}
    </div>
  );
}

/** On/off switch: 52 × 32 track, lime when on (black thumb), 44px tap area. */
function Switch({
  checked,
  label,
  disabled = false,
  onChange,
}: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="flex h-11 w-[60px] flex-none items-center justify-center disabled:opacity-40"
    >
      <span
        aria-hidden
        className={`flex h-8 w-[52px] items-center rounded-full p-1 transition-colors duration-150 ${checked ? "bg-lime" : "bg-line"}`}
      >
        <span
          className={`size-6 rounded-full shadow-sm transition-transform duration-150 ease-out ${
            checked ? "translate-x-5 bg-ink" : "translate-x-0 bg-card"
          }`}
        />
      </span>
    </button>
  );
}

/** Set (new + confirm), change (current, new, confirm) or turn off (current). */
function PinFlow({ flow, onDone }: { flow: Flow; onDone: () => void }) {
  const [step, setStep] = useState<"current" | "new" | "confirm">(flow === "set" ? "new" : "current");
  const [first, setFirst] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const title = step === "current" ? "Enter your current PIN" : step === "new" ? "Choose a 6-digit PIN" : "Enter it again";

  async function onComplete(pin: string) {
    if (step === "current") {
      if (!(await checkPin(pin))) {
        setIsError(true);
        return setMessage("Wrong PIN. Try again.");
      }
      if (flow === "off") {
        clearLock();
        onDone();
        showToast({ message: "App lock turned off" });
        return;
      }
      setIsError(false);
      setMessage(null);
      return setStep("new");
    }
    if (step === "new") {
      const problem = pinProblem(pin);
      if (problem) {
        setIsError(true);
        return setMessage(problem);
      }
      setFirst(pin);
      setIsError(false);
      setMessage(null);
      return setStep("confirm");
    }
    if (pin !== first) {
      setIsError(true);
      setMessage("The PINs didn't match. Choose one again.");
      return setStep("new");
    }
    if (flow === "set") await enableLock(pin);
    else await changePin(pin);
    onDone();
    showToast({ message: flow === "set" ? "App lock is on" : "PIN changed" });
  }

  return (
    <div className="flex flex-col items-center pb-2">
      <PinPad key={step} title={title} message={message} error={isError} onComplete={onComplete} />
    </div>
  );
}
