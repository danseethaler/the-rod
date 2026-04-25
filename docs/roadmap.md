# The Rod — Roadmap

A scripture-thinking workspace for the Brainstorm → Filter → Organize → Enrich pipeline that Dan already uses to prepare talks. Not a generator. Not an oracle. A clean desk.

The name comes from Lehi's vision: the iron rod is the word of God, the thing you hold onto in fog. Existing project (Expo + RN Web) provides the entry point — fast exact-phrase scripture search with markdown blockquote copy. This roadmap extends that into a mobile-first study and talk-prep environment.

---

## Vision

> Compress the friction of **gathering** and **rearranging** so the time left over is for pondering.

Three convictions shape the product:

1. **Inspiration is non-negotiable and non-systematizable.** The app should not generate talks, suggest sequencing, or auto-cluster ideas. That work is the user's, with the Spirit. The app's job is to clear the desk.
2. **The user already has a working philosophy and process.** It lives in `~/Developer/bear` (Speaking Principles, Talk Template, the Dushku teaching model, "Yea, yea; Nay, nay"). The app is a *mobile harness* for that existing system — not a replacement.
3. **Scope stays personal-first.** No accounts, no sync server, no sharing in v1. Local SQLite/MMKV. If it earns broader release later, that's a separate decision made on usage data, not on speculation.

---

## Three sources, one search

The app's unfair advantage is unifying three searchable sources behind a single surface:

| Source              | What it is                                                                                          | Status                                              |
| ------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Scripture text**  | Standard Works (~11K verses), already shipped as static TS data in `the-rod`                        | ✅ Already in the repo                               |
| **Citation index**  | BYU SCI — every General Conference talk 1942→present, citing each verse. Speaker, date, frequency. | ⏳ Acquisition required (see Slice 3)                |
| **Personal corpus** | The user's Bear notes — `faith/speaking`, principles, prior cross-references, ~70 talks            | ⏳ Read-only SQLite access on Mac; mobile path TBD   |

Tapping a verse should reveal: *what it says, who in conference quoted it, and where I've already engaged with it.* That third pane is the compounding moat — eight years of `faith/speaking` notes finally become a search surface instead of a graveyard.

---

## The four-stage flow

Mirrors Dan's existing **Brainstorm → Filter → Organize → Enrich** pipeline (from the Bear *Speaking Principles* note). Each stage is a distinct screen.

### 1. Brainstorm
Voice memo or quick text into a "stack draft." Whisper transcribes. No structure required. The point is to capture without friction. A stack starts as a title + an unstructured pile.

### 2. Filter
Search across all three sources, keep what resonates, discard the rest. Search modes:
- Exact phrase (the Rod's existing matcher)
- Whole-word / variants (stemming — closes a current gap)
- Semantic find (embeddings, optional, later slice)
Rapid keep/discard interaction. Items go onto the stack.

### 3. Organize
Drag the kept items into a sequence. The app does *not* suggest order. Manual rearrangement only — that's where revelation does its work.

### 4. Enrich
- Tap any verse to expand surrounding context inline (no Gospel Library jump — closes a stated pain point)
- Tap any citation to read the full conference talk
- Each item gets a free-text "your thought" field
- Output: Bear note (via `bear://x-callback-url`), markdown to clipboard, or PDF for delivery

A stack carries a "Bake until done" status (Dan's own language from *Speaking Principles*). The user marks readiness — the app doesn't presume to.

---

## Slices

Each slice is independently shippable. Order is a guess; it can be reordered as judgment evolves.

### Slice 1 — The Rod, native (foundation)
**Why first:** smallest defensible step. Used daily on day one. Establishes the architecture pattern from `~/.claude/ARCHITECTURE.md` in this repo.

- Ship existing Expo project to TestFlight (it's already RN — no rewrite)
- Conform to the architecture standard (SafeAreaView edges, KeyboardAvoidingView, custom headers, surface layering, toast+haptic, reduced-motion respect)
- Add iOS Share Extension: copy a verse's markdown blockquote from anywhere in the OS (Safari, Messages, Bear). Tiny scope, high daily utility.
- Add **Send-to-Bear** button on every verse → uses `bear://x-callback-url/add-text` with a target note name. Closes the desktop-only loop in the user's current workflow.
- Add **inline context expansion** — tap a result → surrounding verses unfold in place, with markdown copy still working on each. Removes the Gospel Library round-trip.

**Acceptance:** I can find a verse on my phone, copy its blockquote into Bear or any other app, and read 5 verses of context without leaving the app. Lives on TestFlight on my device.

### Slice 2 — Stacks (local-only)
**Why next:** the four-stage flow is the actual product. Without it, the app is just a faster Rod.

- Local SQLite or MMKV store for stacks
- New screen: **Stacks list** (with "Bake until done" status field)
- New screen: **Stack detail** — sectioned view of items in user-defined order, drag-to-reorder, free-text per item
- Brainstorm capture: text + voice (Whisper via Expo Speech)
- Filter mode: invokes existing search but adds the verse to the active stack instead of just copying
- Output flows: Bear note, markdown to clipboard, PDF (recipe lives in `~/Developer/GoTime/src/lib/export-pdf.ts` — `expo-print` + `expo-sharing`)
- Editor: plain `TextInput` with regex-based markdown syntax styling (headings, bold, blockquote, links). Bear-inspired typography, not Bear-clone.

**Acceptance:** I can shape a draft talk from my phone using the four-stage flow, end-to-end, and export it to a Bear note that matches the structure I currently build by hand.

### Slice 3 — BYU SCI integration
**Why this order:** valuable but requires upstream coordination (or reverse-engineering work). Shouldn't block earlier slices.

Acquisition path, in order of preference:

1. **Email scriptures@byu.edu.** Personal/study use, ask for the citation DB or its update URL. Answer is plausibly yes — they're a research lab, not a vendor.
2. **Capture the Android app's download URL via mitmproxy.** First-launch network call fetches the citation database (~13.5MB region based on APK size growth). Observe traffic, capture URL, re-download on updates.
3. **APK inspection.** `apktool d` to find the hardcoded endpoint. Same outcome.

Once we have the file: inspect schema in DB Browser for SQLite, ship as a static asset bundled with the app. Likely structure: `verses`, `talks`, `speakers`, `citations` (join). Add a verse-detail panel that lists all citations with speaker, date, link out to churchofjesuschrist.org for the full talk.

**Acceptance:** Tap any verse → see every conference talk that quoted it, sorted by date or speaker, with a tap-through to the talk on churchofjesuschrist.org.

### Slice 4 — Personal corpus (Bear)
**Why last:** mobile access to Bear notes is the trickiest piece. The Bear SQLite database is local to the Mac. Two paths:

1. **Sync a derived index.** A small script in `~/Developer/bear` reads the Bear DB and exports a stripped JSON file (titles + scripture references + tags + first paragraph) to iCloud Drive. The mobile app reads from iCloud Drive on launch. Read-only; no write back. Manual refresh.
2. **Migrate notes to a custom store.** Heavier — turns The Rod into a notes app. Probably overshoots scope. Reject for v1.

Path 1 wins. Mobile gets searchable access to "places I've already engaged with this verse," without trying to be Bear.

**Acceptance:** When I tap Alma 32:21 in the app, I see (a) the verse, (b) every conference talk that cited it, and (c) every Bear note where I've already written about it. All offline-capable.

### Slice 5 — Stretch features (do these only if used)

- **Stemming / variant search** — "endure to the end" finds "endureth," "endured." Cheap addition to the existing matcher.
- **Semantic find** — embed the scripture text once, ship vectors as a static asset, run cosine similarity client-side. "Find verses about [theme]." Better than the Topical Guide and offline.
- **Personal talk archive** — every stack you ever made, searchable. "Have I used Mosiah 4:30 before, in what context?"
- **Cross-reference graph** — official footnotes data, scrapable from churchofjesuschrist.org.
- **Preacher mode** — large-text swipe through a stack during delivery. Single-purpose surface.
- **Home screen widget** — daily verse from a starred set.

These are all tempting. Cut every one unless slice 1–4 demonstrate the daily-use habit. Premature features rot the desk.

---

## Architecture notes

- **Stack:** Expo + React Native + RN Web (already in place). TypeScript strict.
- **State:** Zustand store, single source of truth, no optimistic updates (per `~/.claude/CLAUDE.md`).
- **Persistence:** Local-only for v1. SQLite (via `expo-sqlite`) for stacks and the eventual SCI/Bear indexes. MMKV for small key/value (preferences).
- **No Firebase, no auth, no backend.** Different from Numbered. This project doesn't need any of it.
- **Editor:** plain `TextInput` + regex-based syntax styling. Bear-inspired typography.
- **PDF export:** crib `~/Developer/GoTime/src/lib/export-pdf.ts`.
- **Bear interop:** `bear://x-callback-url/add-text` for write; iCloud Drive JSON for read.
- **Theme:** light + dark. Reverent, restrained, typography-forward. Not playful. Not "fun."
- **Routing:** Expo Router. Stacks-detail as form sheet, search as primary tab.

---

## What this app deliberately does NOT do

Naming these is a forcing function. Each one is a feature someone *could* request. None earn their cost.

- ❌ Generate talks or drafts
- ❌ Suggest sequencing of items in a stack
- ❌ Auto-cluster verses into themes
- ❌ Push notifications for "time to ponder" or daily streaks
- ❌ Social sharing, comments, or any multi-user features
- ❌ Replace Bear as a notes app
- ❌ Replace Gospel Library as a reader (we link out for full talks and chapter context)
- ❌ Sync stacks across devices in v1 (iCloud as a follower, not as the model)

If a feature feels like it belongs on this list, it probably does.

---

## Open questions

1. Does BYU answer the email and share the SCI database voluntarily? (Slice 3 path.)
2. Is the syntax-styled `TextInput` approach actually pleasant to write in, or does it need real WYSIWYG? (Build a 1-day prototype to find out before committing to the editor model.)
3. Is the Bear-iCloud-export path acceptable as read-only access, or will the gap of editing-on-mobile bite hard enough to reconsider?
4. Does the personal-only framing hold, or does the talk-prep workflow have value to share with others (e.g. ward members, other bishops) once it works?

These don't need answers yet. They need to be remembered.
