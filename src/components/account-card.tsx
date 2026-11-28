import type { AccountColour } from "@/lib/accounts";
import { accountDigits, formatAccountNumber, formatRupiah } from "@/lib/money";
import { MASK } from "@/lib/amounts";
import { CopyNumberButton } from "@/components/copy-number-button";

/**
 * Card colours, from the colour tokens so they follow light and dark mode. The stored values keep
 * their old names (lime, black) so existing accounts need no data change: "lime" shows amber (the
 * main-action colour) and "black" shows violet (the selected colour). White and grey stay neutral.
 */
export const CARD_STYLES: Record<
  AccountColour,
  { label: string; bg: string; fg: string; muted: string; circle: string; border: string }
> = {
  black: {
    label: "Violet",
    bg: "var(--color-select)",
    fg: "var(--color-on-select)",
    muted: "color-mix(in srgb, var(--color-on-select) 78%, transparent)",
    circle: "color-mix(in srgb, var(--color-on-select) 8%, transparent)",
    border: "transparent",
  },
  lime: {
    label: "Amber",
    bg: "var(--color-accent)",
    fg: "var(--color-on-accent)",
    muted: "color-mix(in srgb, var(--color-on-accent) 78%, transparent)",
    circle: "rgba(6,3,22,0.06)",
    border: "transparent",
  },
  white: { label: "White", bg: "#FFFFFF", fg: "#060316", muted: "#5C5A66", circle: "rgba(6,3,22,0.04)", border: "#E3E3E1" },
  grey: { label: "Grey", bg: "#E3E3E1", fg: "#060316", muted: "#4F4D58", circle: "rgba(255,255,255,0.4)", border: "transparent" },
};

export const COLOURS = Object.keys(CARD_STYLES) as AccountColour[];

/** One soft shadow for every account card (Accounts page, Home stack, form preview). */
export const CARD_SHADOW = "0 2px 10px rgba(17,17,17,0.08)";

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
      className="relative flex w-full flex-col justify-between overflow-hidden rounded-card border p-5 text-left"
      style={{ height: compact ? 190 : 216, background: s.bg, color: s.fg, borderColor: s.border, boxShadow: CARD_SHADOW }}
    >
      <span
        aria-hidden
        className="absolute -top-[70px] -right-[70px] size-[220px] rounded-full"
        style={{ background: s.circle }}
      />
      <span className="card-content relative flex flex-col gap-1" style={content}>
        <span className="text-heading font-bold" style={placeholderName ? { color: s.muted } : undefined}>
          {name}
        </span>
        <span className="flex items-center gap-1 text-meta font-medium tracking-[0.04em]" style={{ color: s.muted }}>
          <span>{shownNumber ?? "No account number"}</span>
          {copyable && digits && <CopyNumberButton digits={digits} name={name} colour={s.muted} />}
        </span>
      </span>
      <span className="card-content relative flex flex-col gap-0.5" style={content}>
        <span className="text-caption font-medium" style={{ color: s.muted }}>
          Balance
        </span>
        <span className="text-amount font-bold tracking-[-0.02em]">{masked ? MASK : formatRupiah(balance)}</span>
        {saved > 0 && !masked && (
          <span className="text-caption font-semibold" style={{ color: s.muted }}>
            {formatRupiah(saved)} saved
          </span>
        )}
      </span>
    </span>
  );
}
