/** Supabase errors are plain objects with a message, not always Error instances. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string" && e.message) return e.message;
  return fallback;
}
