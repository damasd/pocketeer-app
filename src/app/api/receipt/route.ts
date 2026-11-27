import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RECEIPT_SCHEMA, receiptPrompt, toReceiptDraft, type ReceiptCategory } from "@/lib/receipt";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

// Server only: the Gemini key never reaches the browser. The photo is passed through, never stored.
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
/** The browser shrinks photos to about 300 KB; anything far bigger is refused. */
const MAX_BASE64 = 4_000_000;
/** Same limit as the note field in the form (NOTE_MAX in transactions.ts). */
const NOTE_MAX = 120;

export const maxDuration = 30;

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/** POST { image: base64 JPEG, today: "YYYY-MM-DD" } → { draft } or { error }. */
export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fail(503, "Receipt reading isn't set up yet: GEMINI_API_KEY is missing.");

  // Signed-in users only, so nobody else can spend the AI budget.
  const jar = await cookies();
  const db = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: { getAll: () => jar.getAll(), setAll: () => {} },
  });
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return fail(401, "Sign in again to read receipts.");

  let body: { image?: unknown; today?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "That photo didn't arrive. Try again.");
  }
  const image = typeof body.image === "string" ? body.image : "";
  if (!image || image.length > MAX_BASE64 || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return fail(400, "That photo couldn't be used. Try another one.");
  }
  // The phone's own date, so "today" matches the user's day, not the server's time zone.
  const today =
    typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
      ? body.today
      : new Date().toISOString().slice(0, 10);

  // The user's own active expense categories (row level security limits this to their rows).
  const { data: rows, error } = await db
    .from("categories")
    .select("id, name, note")
    .eq("kind", "expense")
    .eq("archived", false)
    .order("sort_order");
  if (error) return fail(500, "Couldn't load your categories. Try again.");
  const categories = (rows ?? []) as ReceiptCategory[];

  let raw: unknown;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: receiptPrompt(categories, today) }],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: RECEIPT_SCHEMA,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    raw = JSON.parse(response.text ?? "null");
  } catch (e) {
    console.error("Receipt reading failed", e);
    return fail(502, "Couldn't read the receipt right now. Try again, or type it in.");
  }

  const draft = toReceiptDraft(raw, { categoryIds: categories.map((c) => c.id), today, noteMax: NOTE_MAX });
  if (!draft) return fail(422, "Couldn't find a receipt in that photo. Try a clearer one, or type it in.");
  return NextResponse.json({ draft }, { headers: { "Cache-Control": "no-store" } });
}
