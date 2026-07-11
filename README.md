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
- **Log list** — cards with photo, name, series, date; search + country/series filters.
- **World map** — one colored pin per country (color is unique per country), pin shows the cup count; click a pin to see the cups from that country.
- **Photos** — upload an image or take a picture (camera on desktop via getUserMedia; on iPhone the native camera sheet opens). Photos are auto-resized to ≤1400px JPEG.
- **Backup / Import** — download a JSON backup (photos embedded) and restore/merge it anywhere.

## Where the data lives
Everything is stored in the **browser's IndexedDB** (no server, no account). That means:
- Data is per-browser, per-device. Use **⬇ Backup / ⬆ Import** to move or safeguard the collection.
- To use it on the iPhone later, host the folder (e.g. GitHub Pages) and import your backup there.

## Tech
Plain HTML/CSS/JS, Leaflet 1.9.4 + CARTO dark tiles (CDN — map needs internet), IndexedDB for storage. No build step, no dependencies to install.
