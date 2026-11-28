/* eslint-disable @next/next/no-img-element -- private signed URL, already resized to 512 px */

/** Profile photo, or the first letter of the name on a lime circle. Decorative: the parent carries the label. */
export function Avatar({
  name,
  photoUrl,
  size = 48,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "·";
  return (
    <span
      aria-hidden
      className="flex flex-none items-center justify-center overflow-hidden rounded-full bg-accent font-bold text-on-accent"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.375) }}
    >
      {photoUrl ? (
        <img src={photoUrl} alt="" width={size} height={size} className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
