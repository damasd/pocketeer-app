"use client";

/** Pill toggle (mockup "Type" control): selected option is black with white text. */
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
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex gap-1 rounded-full p-1 ${surface === "card" ? "border border-line bg-card" : "bg-page"}`}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`h-11 flex-1 rounded-full text-[13px] font-semibold transition-colors duration-150 ${
              on ? "bg-ink text-white" : "text-[#4A4A4A]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
