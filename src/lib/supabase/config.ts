// Public Supabase settings. The publishable (anon) key is safe in the browser:
// row level security decides what each signed-in user can read and write.

/** Forgive common copy-paste slips: spaces, quotes, a missing https://, a trailing path. */
export function normalizeSupabaseUrl(value: string | undefined): string {
  const raw = (value ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    // A real project URL has a dotted host (xyz.supabase.co); this rejects a key pasted by mistake.
    return url.hostname.includes(".") ? url.origin : "";
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
