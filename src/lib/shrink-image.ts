"use client";

/** Longest side after shrinking: enough to read small receipt print, small enough to send fast. */
const MAX_SIDE = 1600;

/**
 * Shrink a photo in the browser and return it as base64 JPEG (no "data:" prefix).
 * Uses an <img> so iPhone photos (HEIC) decode too, upright as taken.
 */
export async function shrinkImage(file: File, maxSide = MAX_SIDE, quality = 0.8): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Can't prepare the photo on this device.");
    ctx.fillStyle = "#FFFFFF"; // transparent PNGs become white, not black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return dataUrl.slice(dataUrl.indexOf(",") + 1);
  } finally {
    URL.revokeObjectURL(url);
  }
}
