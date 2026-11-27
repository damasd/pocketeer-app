import type { ComponentProps, ReactNode } from "react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "lg" | "md" | "sm";
};

/** Pill button. "primary" is the lime main action (black text on lime). */
export function Button({ variant = "primary", size = "lg", className = "", ...props }: ButtonProps) {
  const look = {
    primary: "bg-lime text-ink",
    secondary: "bg-card text-ink ring-1 ring-inset ring-line",
    ghost: "text-ink underline-offset-4 enabled:hover:underline",
    danger: "bg-ember text-white",
  }[variant];
  const dims = {
    lg: "h-14 px-6 text-body font-bold",
    md: "h-12 px-5 text-body font-bold",
    sm: "h-11 px-3 text-body font-semibold",
  }[size];
  return (
    <button
      {...props}
      className={`flex items-center justify-center rounded-full transition-transform duration-150 ease-out enabled:active:scale-[0.98] disabled:opacity-50 ${dims} ${look} ${className}`}
    />
  );
}

/** Text input. 16 px text so iOS Safari doesn't zoom the page on focus. */
export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`h-12 w-full rounded-tile border-0 px-4 text-input font-semibold text-ink placeholder:font-medium placeholder:text-muted ${className}`}
    />
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-meta font-semibold text-muted">
      {children}
    </label>
  );
}

/** Error message: white text on an ember fill (ember text on white fails contrast). */
export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-tile bg-ember px-4 py-3 text-meta font-semibold text-white">
      {children}
    </p>
  );
}
