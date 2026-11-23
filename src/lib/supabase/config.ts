// Public Supabase settings. The publishable (anon) key is safe in the browser:
// row level security decides what each signed-in user can read and write.

/** Forgive common copy-paste slips: spaces, quotes, a missing https://, a trailing path. */
export function normalizeSupabaseUrl(value: string | undefined): string {
  const raw = (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    // Must be the project's own address (xyz.supabase.co). Rejects a key, the
    // dashboard address or this app's address pasted by mistake.
    return /^[a-z0-9]{10,}\.supabase\.(co|in)$/i.test(url.hostname) ? url.origin : "";
  } catch {
    return "";
  }
}

function clean(value: string | undefined): string {
  return (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export const SUPABASE_URL = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_KEY = clean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);
