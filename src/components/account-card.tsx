import type { AccountColour } from "@/lib/accounts";
import { formatRupiah, maskAccountNumber } from "@/lib/money";

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

/** The visual card: name, masked number, balance, and saved amount when there is one. */
export function AccountCardFace({
  name,
  accountNumber,
  colour,
  balance,
  saved = 0,
  placeholderName = false,
  compact = false,
}: {
  name: string;
  accountNumber: string | null;
  colour: AccountColour;
  balance: number;
  saved?: number;
  placeholderName?: boolean;
  compact?: boolean;
}) {
  const s = CARD_STYLES[colour];
  const masked = maskAccountNumber(accountNumber);
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
      <span className="relative flex flex-col gap-1">
        <span className="text-[17px] font-bold" style={placeholderName ? { color: s.muted } : undefined}>
          {name}
        </span>
        <span className="text-[13px] font-medium tracking-[0.04em]" style={{ color: s.muted }}>
          {masked ?? "No account number"}
        </span>
      </span>
      <span className="relative flex flex-col gap-0.5">
        <span className="text-xs font-medium" style={{ color: s.muted }}>
          Balance
        </span>
        <span className="text-[28px] font-bold tracking-[-0.02em]">{formatRupiah(balance)}</span>
        {saved > 0 && (
          <span className="text-xs font-semibold" style={{ color: s.muted }}>
            {formatRupiah(saved)} saved
          </span>
        )}
      </span>
    </span>
  );
}
