# Lehi — Krumb (mobile)

The user-facing app name is **Krumb** (German *Krume* — "the soft inner of
a loaf"; the nourishing middle of bread, distinct from the crust). It's the
mobile app for the broader The-Rod project — a scripture-thinking workspace.

This is a **local-only, no-backend** Expo app that follows the gold-standard
architecture from `~/.claude/ARCHITECTURE.md` with the following deliberate
departures:

- **No Firebase, no auth, no DataListener.** State lives in Zustand and
  persists via `@react-native-async-storage/async-storage`. The app never
  calls a server.
- **No `(auth)` / `(onboarding)` route groups.** The app starts on the
  `(tabs)` group immediately.
- **One Zustand store** — `useStacksStore` — is the single source of truth
  for stacks and stack items. Hydration runs once at app launch in
  `app/_layout.tsx`'s `HydrationGate`.

## Why `lehi/` (folder) and "Krumb" (app)?

Folder name follows the gold-standard role-character convention: Pday →
peter (NT apostle), Numbered → moroni (BoM prophet). The Rod project is
rooted in Lehi's vision (1 Nephi 8), so the mobile-app folder is **lehi**.

The user-facing app name was iterated separately and landed on **Krumb** —
German *Krume* meaning the soft inner part of a bread loaf. The metaphor:
the *soft middle* of the Word, the part you actually feed on, distinct from
the crust. Hebraic-textured K spelling matches the scriptural domain.

## Top-level structure

```
lehi/
├── app.config.ts        # IS_DEV variant + simulator config (named "The Rod")
├── babel.config.js      # nativewind + module-resolver "@/*" -> "./src/*"
├── metro.config.js      # nativewind metro plugin
├── tailwind.config.js   # brand=amber, neutral palette only
├── global.css           # tailwind directives
├── index.ts             # expo-router entry point
└── src/
    ├── app/             # expo-router screens
    ├── components/      # reusable UI
    ├── data/            # bundled scripture corpus (TS files)
    ├── hooks/           # useReducedMotion, useDismissGuard
    ├── lib/             # types, scripture, markdown, haptics, toast, storage, ids
    └── store/           # useStacksStore (Zustand + AsyncStorage)
```

## Routes

- `(tabs)/index.tsx` — **Search** (the original Rod)
- `(tabs)/stacks.tsx` — list of stacks
- `(tabs)/settings.tsx` — about + version
- `stack/new.tsx` — form sheet, create a stack
- `stack/[id]/index.tsx` — stack detail (Brainstorm + Filter + Organize + Enrich on one scroll)
- `stack/[id]/add.tsx` — form sheet, search-and-add verses (Filter step)
- `stack/[id]/export.tsx` — fitToContents form sheet, send to Bear or copy markdown

## Brand color

`brand` in tailwind is **amber** (`#f59e0b` at 500). Picks up the existing
search-highlight gold tone and reads as "lit by revelation" — warm but
restrained, not playful.

## What's not here yet (intentional)

- **iOS Share Extension** (slice 1) — not implemented; tracked in
  `docs/roadmap.md`.
- **Voice / Whisper Brainstorm capture** (slice 2 stretch) — only text
  capture in v1.
- **Drag-to-reorder** — using up/down arrow buttons in v1; will swap to
  `react-native-sortables` once the static surface is verified.
- **BYU SCI citation index** (slice 3) — not yet acquired.
- **Bear note read-only index** (slice 4) — not yet wired.

## Custom simulator

Created via:

```bash
xcrun simctl create "Krumb" \
  com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro \
  com.apple.CoreSimulator.SimRuntime.iOS-26-4
```

Run the app:

```bash
npx expo run:ios --device "Krumb" --port 8087
```

## npm install note

`lucide-react-native@0.468.0` declares an old React peer range. Install
with `--legacy-peer-deps`. Pday lives with the same constraint.
