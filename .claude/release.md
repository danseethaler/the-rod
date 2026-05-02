# Release config — Krumb (lehi)

The Rod / Krumb is a **local-only, no-backend** Expo app. No Firebase, no
Firestore, no admin scripts. The release skill's Firestore-write steps
(3c, 11) do not apply — skip them.

## App identity

- **Display name:** Krumb (production), Krumb (Dev) for development variant
- **iOS bundle id:** `app.krumb.ios` (production), `app.krumb.ios.dev` (dev)
- **iOS ASC app id:** TBD — fill in `eas.json → submit.production.ios.ascAppId` after the app is created in App Store Connect
- **EAS project id:** TBD — populated by `eas init` on first run; will land in `lehi/app.config.ts → extra.eas.projectId`
- **EAS account:** `danseethaler_weekly`
- **Android:** not shipped
- **Firebase project:** not used

## Paths

- **Mobile app dir:** `lehi`
- **Backend dir:** not used
- **Hosted dir:** not used
- **Version file:** `lehi/app.config.ts` (field: `version`)
- **Changelog:** none
- **Fastlane release-notes JSON:** none

## Build & upload

- **Upload method:** `eas-submit` (no fastlane in this project)
- **EAS build profile:** `production` (defined in `lehi/eas.json`)
- **EAS update channel:** `production`
- **App version source:** `remote` (EAS owns the build number; no local
  buildNumber field to commit after each build)

## Platforms

- **iOS only.** Skip the Android question.

## First-time setup (run interactively)

The project has never been built. Before the release skill can do an
end-to-end run, an authenticated user needs to:

1. **Register the bundle id `app.krumb.ios`** in the Apple Developer
   portal (and `app.krumb.ios.dev` if dev builds are wanted).
2. **Create the App Store Connect app record** for `app.krumb.ios` and
   paste its numeric app id into `lehi/eas.json` under
   `submit.production.ios.ascAppId`.
3. From `lehi/`, run `npx eas-cli init` to link the project — this writes
   `extra.eas.projectId` into `app.config.ts`.
4. From `lehi/`, run `npx eas-cli credentials` once to provision the iOS
   distribution certificate and provisioning profile (or let the build
   command prompt for them on first run).

After that, `/release testflight ios` will run end-to-end without
prompts.
