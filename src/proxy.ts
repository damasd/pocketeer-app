import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";

const LOGIN = "/login";

/**
 * Runs before every page: refreshes the Supabase session cookie and sends
 * signed-out visitors to /login. Data itself is protected by row level security.
 */
export async function proxy(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);
  const onLogin = request.nextUrl.pathname === LOGIN;

  if (signedIn === onLogin) {
    // Signed out and not on /login, or signed in and on /login.
    const url = request.nextUrl.clone();
    url.pathname = signedIn ? "/" : LOGIN;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    redirect.headers.set("Cache-Control", "private, no-store");
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, icons and the manifest (needed by Add to Home Screen).
    "/((?!_next/static|_next/image|icon|apple-icon|pwa-icon|manifest.webmanifest|favicon.ico).*)",
  ],
};
