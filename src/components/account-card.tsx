import type { AccountColour } from "@/lib/accounts";
import { accountDigits, formatAccountNumber, formatRupiah } from "@/lib/money";
import { MASK } from "@/lib/amounts";
import { CopyNumberButton } from "@/components/copy-number-button";

/** Card colours from the mockup (Wallet.dc.html / NewWallet.dc.html). Palette colours only. */
export const CARD_STYLES: Record<
  AccountColour,
  { label: string; bg: string; fg: string; muted: string; circle: string; border: string }
> = {
  black: { label: "Black", bg: "#111111", fg: "#FFFFFF", muted: "#BDBDBD", circle: "rgba(255,255,255,0.06)", border: "transparent" },
  lime: { label: "Lime", bg: "#D1FC00", fg: "#111111", muted: "#333333", circle: "rgba(17,17,17,0.06)", border: "transparent" },
  white: { label: "White", bg: "#FFFFFF", fg: "#111111", muted: "#6B6B6B", circle: "rgba(17,17,17,0.04)", border: "#E4E4E4" },
  grey: { label: "Grey", bg: "#E4E4E4", fg: "#111111", muted: "#4A4A4A", circle: "rgba(255,255,255,0.4)", border: "transparent" },
};

export const COLOURS = Object.keys(CARD_STYLES) as AccountColour[];

/** The visual card: name, account number, balance, and saved amount when there is one. */
export function AccountCardFace({
  name,
  accountNumber,
  colour,
  balance,
  saved = 0,
  placeholderName = false,
  compact = false,
  masked = false,
  copyable = false,
  contentHidden = false,
}: {
  name: string;
  accountNumber: string | null;
  colour: AccountColour;
  balance: number;
  saved?: number;
  placeholderName?: boolean;
  compact?: boolean;
  /** Show "Rp ••••••" instead of the amounts (hidden amounts on the Accounts page). */
  masked?: boolean;
  /** Show a copy button next to the account number (Accounts page only, not the form preview). */
  copyable?: boolean;
  /** Start with the text hidden (Home card stack fades it in while the card is pulled). */
  contentHidden?: boolean;
}) {
  const s = CARD_STYLES[colour];
  const shownNumber = formatAccountNumber(accountNumber);
  const digits = accountDigits(accountNumber);
  const content = contentHidden ? { opacity: 0 } : undefined;
  return (
    <span
      className="relative flex w-full flex-col justify-between overflow-hidden rounded-3xl border p-5 text-left"
      style={{ height: compact ? 190 : 216, background: s.bg, color: s.fg, borderColor: s.border }}
    >
      <span
        aria-hidden
        className="absolute -top-[70px] -right-[70px] size-[220px] rounded-full"
        style={{ background: s.circle }}
      />
      <span className="card-content relative flex flex-col gap-1" style={content}>
        <span className="text-[17px] font-bold" style={placeholderName ? { color: s.muted } : undefined}>
          {name}
        </span>
        <span className="flex items-center gap-1 text-[13px] font-medium tracking-[0.04em]" style={{ color: s.muted }}>
          <span>{shownNumber ?? "No account number"}</span>
          {copyable && digits && <CopyNumberButton digits={digits} name={name} colour={s.muted} />}
        </span>
      </span>
      <span className="card-content relative flex flex-col gap-0.5" style={content}>
        <span className="text-xs font-medium" style={{ color: s.muted }}>
          Balance
        </span>
        <span className="text-[28px] font-bold tracking-[-0.02em]">{masked ? MASK : formatRupiah(balance)}</span>
        {saved > 0 && !masked && (
          <span className="text-xs font-semibold" style={{ color: s.muted }}>
            {formatRupiah(saved)} saved
          </span>
        )}
      </span>
    </span>
  );
}
