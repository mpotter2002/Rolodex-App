# Rolo — React Native + Expo

Digital Rolodex app. Scan business cards, manage contacts, organize by category.

## Quick Start (test on your phone)

```bash
cd rolo-app
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS App Store / Android Play Store).
Your phone and computer must be on the same WiFi network.

## Run on Web

```bash
npx expo start --web
```

## Project Structure

```
rolo-app/
├── App.tsx                  # Entry point (auth gate + navigation)
├── app.json                 # Expo config (permissions, icons, splash)
├── eas.json                 # EAS Build config (dev/preview/production)
├── src/
│   ├── screens/
│   │   ├── AuthFlow.tsx     # Splash, login, signup, forgot password, onboarding
│   │   ├── DeckScreen.tsx   # Rolodex deck + list view with search/filter/sort
│   │   ├── ScanScreen.tsx   # Camera/gallery card capture + manual contact form
│   │   └── SettingsScreen.tsx # Pro banner, contacts import, account, data mgmt
│   ├── components/
│   │   ├── ContactDetailSheet.tsx  # Contact detail modal (share, edit, delete)
│   │   └── PaywallSheet.tsx        # Subscription plans (Monthly/Yearly/Lifetime)
│   ├── navigation/
│   │   └── AppNavigator.tsx # Bottom tab nav (Rolo / + / Settings)
│   ├── utils/
│   │   ├── ContactsContext.tsx # Global contacts state (React Context)
│   │   ├── storage.ts         # AsyncStorage persistence
│   │   └── theme.ts           # Colors, fonts, radius constants
│   ├── types/
│   │   └── contact.ts        # Contact & Category TypeScript interfaces
│   └── data/
│       ├── categories.ts     # Category definitions + auto-suggest logic
│       └── demoContacts.ts   # 10 demo contacts seeded on first launch
└── assets/
    └── rolo-logo.png         # App icon & splash image
```

## Build for App Store / Play Store

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo account
eas login

# Build for iOS (TestFlight)
eas build --platform ios --profile preview

# Build for Android (APK)
eas build --platform android --profile preview

# Build for production
eas build --platform all --profile production
```

## TODO — Native Features

- [ ] Wire up ML Kit OCR for on-device card text extraction
- [ ] Connect real phone contacts via `expo-contacts`
- [ ] Add backend (Supabase/Firebase) for cloud sync & auth
- [ ] Set up RevenueCat for in-app subscriptions
- [ ] Push notifications via `expo-notifications`
- [ ] TestFlight beta → App Store submission

## Tomorrow Plan — Clerk + Stripe Integration (planning only)

- [ ] Confirm Clerk and Stripe plugin setup in Expo project config and local env keys.
- [ ] Add Clerk auth shell in app bootstrap (`signed in` / `signed out` routes) with protected app tabs.
- [ ] Define subscription source of truth (`free` vs `pro`) and where entitlement is stored/read.
- [ ] Replace mock premium unlock with real Stripe-backed purchase flow from paywall.
- [ ] Add account/billing entry in Settings (manage subscription, restore purchases, sign out).
- [ ] Add post-purchase entitlement refresh on app start and after checkout return.
- [ ] Add QA checklist: new user sign-up, sign-in/out, upgrade, restore, and downgrade/cancel behavior.
