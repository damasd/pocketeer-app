"use client";

import { useState, type FormEvent } from "react";
import { AccountCardFace, CARD_STYLES, COLOURS } from "@/components/account-card";
import { Segmented } from "@/components/segmented";
import { Button, ErrorNote, Input, Label } from "@/components/ui";
import {
  ACCOUNT_NAME_MAX,
  createAccount,
  saveAccount,
  setAccountArchived,
  type Account,
  type AccountColour,
  type AccountGroup,
} from "@/lib/accounts";
import { groupThousands, parseRupiahInput } from "@/lib/money";
import { errorMessage } from "@/lib/errors";

/** New account / edit account form (mockup NewWallet.dc.html). Lives inside a Sheet. */
export function AccountForm({
  account,
  nextSortOrder,
  onDone,
}: {
  account: Account | null;
  nextSortOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [number, setNumber] = useState(account?.accountNumber ?? "");
  const [group, setGroup] = useState<AccountGroup>(account?.group ?? "spending");
  const [colour, setColour] = useState<AccountColour>(account?.colour ?? "black");
  const [balance, setBalance] = useState(account?.startingBalance ?? 0);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const nameMissing = tried && !trimmed;

  async function run(task: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await task();
      onDone();
    } catch (e) {
      setError(errorMessage(e, "Could not save the account"));
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!trimmed) return;
    const input = { name: trimmed, accountNumber: number || null, group, colour, startingBalance: balance };
    run(() => (account ? saveAccount(account.id, input) : createAccount(input, nextSortOrder)));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div role="img" aria-label={`Card preview: ${trimmed || "Account name"}`}>
        <AccountCardFace
          compact
          name={trimmed || "Account name"}
          placeholderName={!trimmed}
          accountNumber={number}
          colour={colour}
          balance={balance}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="account-name">Name</Label>
        <Input
          id="account-name"
          placeholder="e.g. Mandiri"
          maxLength={ACCOUNT_NAME_MAX}
          autoComplete="off"
          value={name}
          aria-invalid={nameMissing}
          aria-describedby={nameMissing ? "account-name-error" : undefined}
          onChange={(e) => setName(e.target.value)}
          className={`bg-page ${nameMissing ? "ring-2 ring-ember ring-inset" : ""}`}
        />
        {nameMissing && (
          <p id="account-name-error" className="self-start rounded-full bg-ember px-3 py-1 text-[13px] font-semibold text-white">
            Give the account a name first
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="account-number">Account number (optional)</Label>
        <Input
          id="account-number"
          inputMode="numeric"
          placeholder="e.g. 1234567890"
          autoComplete="off"
          value={number}
          onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 20))}
          className="bg-page tracking-[0.02em]"
        />
        <p className="text-xs font-medium text-muted">Only the last 4 digits are shown on the card.</p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Type</span>
        <Segmented
          label="Account type"
          value={group}
          onChange={setGroup}
          options={[
            { value: "spending", label: "Spending" },
            { value: "saving", label: "Saving" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-muted">Colour</span>
        <div role="group" aria-label="Card colour" className="flex gap-2.5">
          {COLOURS.map((c) => {
            const on = c === colour;
            return (
              <button
                key={c}
                type="button"
                aria-label={CARD_STYLES[c].label}
                aria-pressed={on}
                onClick={() => setColour(c)}
                className="flex size-11 items-center justify-center rounded-full"
              >
                <span
                  aria-hidden
                  className="size-10 rounded-full border"
                  style={{
                    background: CARD_STYLES[c].bg,
                    borderColor: c === "white" ? "#E4E4E4" : "transparent",
                    boxShadow: on ? "0 0 0 3px #FFFFFF, 0 0 0 5px #111111" : "none",
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="starting-balance">Starting balance</Label>
        <div className="flex h-[52px] items-center gap-1.5 rounded-2xl bg-page px-4">
          <span aria-hidden className="text-[15px] font-semibold text-muted">
            Rp
          </span>
          <input
            id="starting-balance"
            inputMode="numeric"
            autoComplete="off"
            aria-label="Starting balance in rupiah"
            value={groupThousands(balance)}
            onChange={(e) => setBalance(parseRupiahInput(e.target.value))}
            onFocus={(e) => e.currentTarget.select()}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-base font-semibold text-ink outline-none"
          />
        </div>
        <p className="text-xs font-medium text-muted">What was in the account before you started logging here.</p>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button type="submit" disabled={busy} className="mt-2">
        {busy ? "Saving…" : account ? "Save changes" : "Create account"}
      </Button>

      {account && (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => run(() => setAccountArchived(account.id, !account.archived))}
        >
          {account.archived ? "Restore account" : "Archive account"}
        </Button>
      )}
      {account && !account.archived && (
        <p className="-mt-2 text-center text-xs font-medium text-muted">
          Archived accounts are hidden from lists and pickers. Nothing is deleted.
        </p>
      )}
    </form>
  );
}
