# Cup Atlas ☕ — Starbucks Cup Collection

A single-file web app (installable PWA) that logs your Starbucks cup collection on a world map.

## Use it
- **Live (iPhone / Android / any browser):** https://yttcbmqhsz-thefirst.github.io/cup-atlas/
- **On the Mac locally:** double-click **`start.command`** (serves on `http://localhost:8787`).
  Opening `index.html` directly also works, but the **camera button needs localhost/https**.

## Install on your phone
- **iPhone (Safari):** open the live URL → Share → **Add to Home Screen**. Opens full-screen like a native app.
- **Android (Chrome):** open the live URL → ⋮ menu → **Add to Home screen / Install app**.
Works offline after the first load (map tiles still need internet).

## Features
- **Shared collection** — everyone who opens the site sees the same cups; adding/editing needs the shared PIN (asked once per device).
- **Log list** — cards with photo, name, series, date; search + country/series filters.
- **World map** — one colored pin per country (color is unique per country), pin shows the cup count; click a pin to see the cups from that country.
- **Photos** — upload an image or take a picture (camera on desktop via getUserMedia; on iPhone the native camera sheet opens). Photos are auto-resized to ≤1400px JPEG.
- **✨ Scan cup** — AI (Gemini vision) reads the cup photo and auto-fills name, country, city, and series.
- **Backup / Import** — download a JSON backup (photos embedded); import pushes cups into the shared collection (PIN required).

## Where the data lives
Cups and photos live in a **Supabase** backend (Postgres + storage, EU region):
- **Reading is public** — anyone with the URL sees the collection (row-level security allows select only).
- **Writing is PIN-gated** — all add/edit/delete/scan calls go through an edge function that checks a shared PIN; the database and storage accept no direct anonymous writes.
- The Gemini API key lives server-side as a function secret — never in this repo or the browser.

## Tech
Plain HTML/CSS/JS (single file, installable PWA), Leaflet 1.9.4 + CARTO dark tiles, Supabase (Postgres + Storage + Edge Function in Deno), Gemini vision for recognition. No build step.
