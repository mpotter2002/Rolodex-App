# Rolo

A static, single-page contact manager web app (digital Rolodex) with business card OCR scanning via Tesseract.js.

## Cursor Cloud specific instructions

### Architecture

- **Zero-backend, zero-build** — the entire app is a single `index.html` (~3300 lines of inline HTML/CSS/JS) plus two image assets (`logo.svg`, `Rolodex Logo 1.png`).
- No `package.json`, no bundler, no build step, no tests, no linter config.
- External deps loaded via CDN only: Google Fonts (DM Sans) and Tesseract.js v5.
- All contact data is persisted to `localStorage` (`roledex_contacts_v1` key).
- Auth screens are purely cosmetic — any sign-in button dismisses the overlay.

### Running the dev server

Serve the repo root with any static HTTP server. A `file://` URL will cause CORS issues with Tesseract.js Web Workers.

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html` in Chrome.

### Lint / Test / Build

There are no lint, test, or build commands — this is a plain HTML project with no tooling.
