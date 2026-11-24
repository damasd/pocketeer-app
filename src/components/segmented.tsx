"use client";

/**
 * Pill toggle (mockup "Type" control): the selected option sits on a black pill with white text.
 * The pill slides to the option you tap.
 *
 * The labels are drawn twice: grey ones (the real buttons) and a white copy on top that is cut
 * to the pill's shape and moves with it. So a label is white exactly where the pill covers it,
 * mid-slide too, and never flashes white on the light background.
 */
const SLIDE = "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  surface = "page",
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** "page" on white sheets; "card" (white with a line) on the grey page background. */
  surface?: "page" | "card";
}) {
  const n = options.length;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  // One option is the row minus its 4 px padding each side and the 4 px gaps, split n ways.
  const width = `((100% - 8px - ${(n - 1) * 4}px) / ${n})`;
  const left = `(4px + ${index} * (${width} + 4px))`;
  const clip = `inset(4px calc(100% - ${left} - ${width}) 4px calc(${left}) round 9999px)`;

  return (
    <div
      role="group"
      aria-label={label}
      className={`relative flex gap-1 rounded-full p-1 ${surface === "card" ? "border border-line bg-card" : "bg-page"}`}
    >
      <span
        aria-hidden
        className={`absolute top-1 bottom-1 left-1 rounded-full bg-ink transition-transform ${SLIDE}`}
        style={{ width: `calc${width}`, transform: `translateX(calc(${index} * (100% + 4px)))` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="relative h-11 flex-1 rounded-full text-[13px] font-semibold text-[#4A4A4A]"
        >
          {o.label}
        </button>
      ))}
      {/* White labels, shown only inside the pill. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 flex gap-1 p-1 text-[13px] font-semibold text-white transition-[clip-path] ${SLIDE}`}
        style={{ clipPath: clip }}
      >
        {options.map((o) => (
          <span key={o.value} className="flex h-11 flex-1 items-center justify-center">
            {o.label}
          </span>
        ))}
      </span>
    </div>
  );
}
