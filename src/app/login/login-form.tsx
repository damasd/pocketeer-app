"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import { supabase } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

const RESEND_SECONDS = 60;

function friendly(message: string) {
  const m = message.toLowerCase();
  if (m.includes("signups not allowed") || m.includes("user not found"))
    return "This email can't sign in here.";
  if (m.includes("expired") || m.includes("invalid")) return "That code is wrong or has expired. Try again or send a new one.";
  if (m.includes("rate limit") || m.includes("security purposes")) return "Too many emails sent. Wait a minute and try again.";
  return message;
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function sendCode(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      // Only existing users can sign in; nobody can create an account from this page.
      options: { shouldCreateUser: false },
    });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setStep("code");
    setCode("");
    setWait(RESEND_SECONDS);
    requestAnimationFrame(() => codeRef.current?.focus());
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code, type: "email" });
    if (error) {
      setBusy(false);
      return setError(friendly(error.message));
    }
    router.replace("/");
    router.refresh();
  }

  if (!supabaseConfigured) {
    return <ErrorNote>Supabase isn&apos;t set up yet. Add the keys to .env.local (see README).</ErrorNote>;
  }

  if (step === "email") {
    return (
      <form onSubmit={sendCode} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Sign in</h1>
          <p className="text-[15px] font-medium text-muted">We&apos;ll email you a 6-digit code.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-card"
          />
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
        <Button type="submit" disabled={busy || !email.includes("@")}>
          {busy ? "Sending…" : "Send code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Enter the code</h1>
        <p className="text-[15px] font-medium text-muted">
          Sent to <span className="font-semibold text-ink">{email.trim()}</span>
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">6-digit code</Label>
        <Input
          ref={codeRef}
          id="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={8}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className="bg-card text-center !text-2xl tracking-[0.4em]"
        />
      </div>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-col gap-2">
        <Button type="submit" disabled={busy || code.length < 6}>
          {busy ? "Checking…" : "Sign in"}
        </Button>
        <div className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setStep("email");
              setError(null);
            }}
          >
            Change email
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy || wait > 0}
            onClick={() => sendCode()}
          >
            {wait > 0 ? `Resend in ${wait}s` : "Resend code"}
          </Button>
        </div>
      </div>
    </form>
  );
}
