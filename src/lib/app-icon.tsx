import { ImageResponse } from "next/og";

/** App icon: lime Log circle with a black + on ink, drawn at any square size. */
export function appIcon(size: number, { padded = false } = {}) {
  // Maskable/Android icons need the mark inside the central safe zone.
  const circle = Math.round(size * (padded ? 0.5 : 0.62));
  const bar = Math.round(circle * 0.5);
  const thick = Math.max(2, Math.round(circle * 0.09));
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
        }}
      >
        <div
          style={{
            width: circle,
            height: circle,
            borderRadius: circle,
            background: "#D1FC00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", width: bar, height: thick, borderRadius: thick, background: "#111111" }} />
          <div style={{ position: "absolute", width: thick, height: bar, borderRadius: thick, background: "#111111" }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
