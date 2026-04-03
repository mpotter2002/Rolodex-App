# Rolo — React Native + Expo

Rolo is a mobile-first digital Rolodex built with Expo and React Native. It scans business cards, imports phone contacts, stores contacts locally with optional Supabase sync, and now uses an AI-assisted cleanup pass for messy card layouts.

## Current Status

- Native auth is wired with Supabase email/password, Google, Apple, and password recovery.
- Business card scanning uses `ML Kit OCR -> Supabase Edge Function -> gpt-4.1-mini -> review UI`.
- Ambiguous scans can now surface candidate values and create multiple contacts from one shared card.
- Contacts import UI is polished and searchable.
- The main remaining step is native validation on a fresh iOS build, then the first production/TestFlight pass.

## Quick Start

```bash
cd rolo-app
npm install
npx expo start
```

Scan the QR code with Expo Go for fast UI iteration.

## Important Expo Go Limitations

Expo Go is useful for:

- general UI work
- auth screen polish
- list/deck/settings flows
- most non-native styling changes

Expo Go is not the source of truth for:

- ML Kit OCR
- Apple Sign In
- final Google native redirect behavior
- contacts permission edge cases
- full scan pipeline validation

Those should be tested in an iOS preview or production build.

## Environment

Local development expects these public Expo env vars in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Cloud builds also need those same values set in EAS for the relevant environment.

## Auth Notes

- App scheme: `rolo`
- Supabase redirect allowlist should include `rolo://**`
- Google is configured through Supabase OAuth
- Apple uses native sign-in with ID token + nonce handling
- Password recovery now uses a deep link back into the app and an in-app password reset screen

## Scan Flow

1. User captures or selects a card image
2. ML Kit OCR reads raw text on-device
3. The app sends OCR text plus the image to Supabase Edge Function `extract-card`
4. The function calls `gpt-4.1-mini` and returns structured candidates
5. The app prefills the primary result
6. If the card is ambiguous, the review UI lets the user choose values before save
7. If multiple names are selected, the app creates multiple contacts in one save

## Project Structure

```text
rolo-app/
├── App.tsx
├── app.json
├── eas.json
├── assets/
├── src/
│   ├── components/
│   ├── data/
│   ├── navigation/
│   ├── screens/
│   ├── types/
│   └── utils/
└── README.md
```

## Builds

```bash
# Preview iOS build
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

See [RELEASE_CHECKLIST.md](/Users/michaelpotter/ClaudeCowork/projects/Rolodex-App/rolo-app/RELEASE_CHECKLIST.md) for the current pre-TestFlight checklist.

## Recent Milestones

- Dark mode and system theme support
- Native Supabase auth and session persistence
- Apple and Google auth provider setup
- Contacts import permission/settings recovery flow
- AI-assisted scan extraction and multi-value review flow
- Multi-contact creation from shared cards

## Still To Validate Natively

- Email sign up / sign in / password recovery
- Apple sign in
- Google sign in
- Latest contacts import sheet behavior
- OCR + AI extraction on real business cards
- First production build and TestFlight submission
