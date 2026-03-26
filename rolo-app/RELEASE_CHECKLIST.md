# Rolo Release Checklist

## Next Native Validation Pass

Run this on the next fresh iOS preview build.

### Auth

- Sign up with email/password
- Confirm email flow if applicable
- Sign in with email/password
- Forgot password email sends successfully
- Password recovery deep link returns to app
- User can set a new password inside the app
- Sign in with Google completes successfully
- Sign in with Apple completes successfully
- Sign out works
- Relaunch app and confirm session persistence

### Contacts Import

- First-time permission request behaves correctly
- Limited/no-contact state gives a clear message
- Settings deep link opens correctly when permission is denied
- Search works in the import sheet
- No contacts are selected by default
- Sheet gesture/dismiss behavior feels like the rest of the app

### Scan Flow

- Clean/simple card extracts correctly
- Unusual layout card improves with AI cleanup
- Front/back split info still produces a usable result
- Review UI appears for ambiguous cards
- Multi-select works for phones/emails/websites
- Multiple selected names create multiple contacts
- Loading overlay appears during extraction

### Visual / App Polish

- Theme defaults to system
- Auth/onboarding dark mode looks correct
- Deck animation still feels good on-device
- Settings About section shows expected debug/build label

## Before First Production Build

- Confirm Supabase preview/prod env vars are set correctly
- Confirm Google provider config is still enabled in Supabase
- Confirm Apple provider config is still enabled in Supabase
- Confirm `extract-card` edge function is deployed
- Confirm OpenAI secret is present in Supabase
- Rotate any credentials that were exposed during setup

## Production / TestFlight

- Run `eas build --platform ios --profile production`
- Install and smoke test the production build
- Submit production build to TestFlight / App Store Connect
- Verify App Store metadata and screenshots are ready
- Do one final pass on auth, contacts import, and scan reliability
