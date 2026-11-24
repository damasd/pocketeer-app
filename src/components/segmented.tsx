"use client";

/**
 * Pill toggle (mockup "Type" control): the selected option sits on a black pill with white text.
 * The pill slides to the option you tap.
 */
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
  return (
    <div
      role="group"
      aria-label={label}
      className={`relative flex gap-1 rounded-full p-1 ${surface === "card" ? "border border-line bg-card" : "bg-page"}`}
    >
      {/* Sliding pill: one option wide (the row minus its padding and gaps), moved by whole options. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full bg-ink transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 8px - ${(n - 1) * 4}px) / ${n})`,
          transform: `translateX(calc(${index} * (100% + 4px)))`,
        }}
      />
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`relative h-11 flex-1 rounded-full text-[13px] font-semibold transition-colors duration-300 motion-reduce:transition-none ${
              on ? "text-white" : "text-[#4A4A4A]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
