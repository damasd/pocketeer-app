"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { showToast } from "@/components/toast";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Fallback for browsers that block the clipboard API: copy from a hidden text field. */
function legacyCopy(text: string): boolean {
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  field.remove();
  return ok;
}

/**
 * Small copy icon next to an account number. The visible icon is 16 px, the tap area 44 px
 * (negative margins keep it from pushing the card layout).
 */
export function CopyNumberButton({ digits, name, colour }: { digits: string; name: string; colour: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    if ((await writeClipboard(digits)) || legacyCopy(digits)) {
      setCopied(true);
      showToast({ message: "Account number copied" });
    } else {
      showToast({ message: "Couldn't copy. Try again.", tone: "error" });
    }
  }

  const Icon = copied ? Check : Copy;
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${name} account number`}
      className="relative z-10 -my-3.5 -mr-3 flex size-11 shrink-0 items-center justify-center rounded-full"
      style={{ color: colour }}
    >
      <Icon aria-hidden size={16} strokeWidth={2.25} />
    </button>
  );
}
