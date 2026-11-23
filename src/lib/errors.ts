export const OFFLINE_MESSAGE = "No connection. Check your internet and try again.";

/** Browser wording for a request that never reached the server (Safari, Chrome, Firefox, Node). */
const NETWORK = /^(load failed|failed to fetch|networkerror when attempting to fetch resource\.?|fetch failed|network request failed)$/i;

/** Supabase errors are plain objects with a message, not always Error instances. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "message" in e && typeof e.message === "string" && e.message) {
    const message = e.message.replace(/^TypeError:\s*/, "");
    return NETWORK.test(message.trim()) ? OFFLINE_MESSAGE : e.message;
  }
  return fallback;
}
