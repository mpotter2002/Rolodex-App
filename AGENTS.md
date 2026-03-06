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

### Screens & Flows

All screens live in the single `index.html` file. Key flows:

- **Auth**: Splash → Sign In / Sign Up → mock social auth → dismisses to app
- **Forgot Password**: Login → "Forgot password?" → email input → "Reset link sent" confirmation
- **Onboarding**: 4-page walkthrough shown once after first sign-in (stored in `rolo_onboarded` localStorage key)
- **Deck view**: Rolodex-style swipeable cards with search + category filters
- **List view**: Scrollable contact list with sort dropdown (Name A-Z, Date, Company)
- **Contact detail**: Bottom sheet with call/email/SMS actions, Edit and Share buttons
- **Share contact**: Bottom sheet overlay with Copy/SMS/Email share options
- **Scan / Add**: Camera upload + Tesseract.js OCR + manual form entry
- **Settings**: Pro banner, Phone Contacts import, Data management, Account, About
- **Paywall**: Full-screen overlay with Monthly/Yearly/Lifetime plan selection
- **Phone Contacts Import**: Mock permissions flow with selectable contact list
