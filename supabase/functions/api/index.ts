// Cup Atlas API — PIN-gated writes + Gemini cup recognition.
// Secrets (set via `supabase secrets set`): CUP_PIN, GEMINI_API_KEY.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const SERIES = [
  "You Are Here", "Been There", "Global Icon", "City Mugs (Skyline)", "Architecture",
  "Relief", "Discovery", "Icon Mini / Ornament", "Anniversary", "Holiday / Christmas",
  "Sakura / Seasonal", "Siren / Core", "Reserve", "Tumbler", "Other",
];

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/^data:[^,]+,/, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "bad JSON" }, 400); }
  const action = String(body.action ?? "");
  const pin = String(body.pin ?? "");

  if (!pin || pin !== Deno.env.get("CUP_PIN")) return json({ error: "wrong PIN" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ---------- save (insert or update, optional photo) ----------
  if (action === "save") {
    const c = (body.cup ?? {}) as Record<string, unknown>;
    const name = String(c.name ?? "").trim().slice(0, 80);
    const country = String(c.country ?? "").toUpperCase();
    if (!name) return json({ error: "name required" }, 400);
    if (!/^[A-Z]{2}$/.test(country)) return json({ error: "bad country" }, 400);
    const row: Record<string, unknown> = {
      name,
      country,
      city: String(c.city ?? "").trim().slice(0, 60),
      series: String(c.series ?? "Other").slice(0, 40),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(c.date ?? "")) ? c.date : null,
      notes: String(c.notes ?? "").trim().slice(0, 500),
    };
    if (typeof c.id === "string" && /^[0-9a-f-]{36}$/.test(c.id)) row.id = c.id;

    // Insert/update first to get the id, then attach the photo.
    const { data: saved, error } = await sb.from("cups").upsert(row).select().single();
    if (error) return json({ error: error.message }, 500);

    if (typeof body.photo_b64 === "string" && body.photo_b64.length > 0) {
      if (body.photo_b64.length > 8_000_000) return json({ error: "photo too large" }, 413);
      const bytes = b64ToBytes(body.photo_b64);
      const path = `${saved.id}.jpg`;
      const { error: upErr } = await sb.storage.from("cups")
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) return json({ error: upErr.message }, 500);
      const { data: withPhoto, error: phErr } = await sb.from("cups")
        .update({ photo_path: path }).eq("id", saved.id).select().single();
      if (phErr) return json({ error: phErr.message }, 500);
      return json({ cup: withPhoto });
    }
    if (body.remove_photo === true && saved.photo_path) {
      await sb.storage.from("cups").remove([saved.photo_path]);
      const { data: noPhoto } = await sb.from("cups")
        .update({ photo_path: null }).eq("id", saved.id).select().single();
      return json({ cup: noPhoto ?? saved });
    }
    return json({ cup: saved });
  }

  // ---------- delete ----------
  if (action === "delete") {
    const id = String(body.id ?? "");
    if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad id" }, 400);
    const { data: row } = await sb.from("cups").select("photo_path").eq("id", id).single();
    if (row?.photo_path) await sb.storage.from("cups").remove([row.photo_path]);
    const { error } = await sb.from("cups").delete().eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // ---------- recognize (Gemini vision) ----------
  if (action === "recognize") {
    const photo = String(body.photo_b64 ?? "").replace(/^data:[^,]+,/, "");
    if (!photo) return json({ error: "photo_b64 required" }, 400);
    const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-flash-latest";
    const prompt =
      `This is a photo of a Starbucks collectible cup or mug. These cups usually have a city or country name printed on them (series like "You Are Here", "Been There", city mugs). Identify it and answer with JSON only:
{"name": short display name like "You Are Here — Tokyo" (or best guess), "country_code": ISO-3166-1 alpha-2 code of the place shown on the cup (or "" if unknown), "city": city name if identifiable else "", "series": one of ${JSON.stringify(SERIES)}, "confidence": 0..1}`;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [
            { inlineData: { mimeType: "image/jpeg", data: photo } },
            { text: prompt },
          ]}],
          generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
        }),
      },
    );
    if (!res.ok) return json({ error: `gemini ${res.status}: ${(await res.text()).slice(0, 300)}` }, 502);
    const out = await res.json();
    const text = out?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      const g = JSON.parse(text);
      return json({
        name: String(g.name ?? "").slice(0, 80),
        country_code: /^[A-Za-z]{2}$/.test(String(g.country_code ?? "")) ? String(g.country_code).toUpperCase() : "",
        city: String(g.city ?? "").slice(0, 60),
        series: SERIES.includes(g.series) ? g.series : "Other",
        confidence: Math.max(0, Math.min(1, Number(g.confidence) || 0)),
      });
    } catch {
      return json({ error: "gemini returned non-JSON" }, 502);
    }
  }

  return json({ error: "unknown action" }, 400);
});
