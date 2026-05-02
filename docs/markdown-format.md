# Krumb Markdown Format

Canonical spec for the markdown shape that Krumb both **emits** (export
to clipboard / Bear) and **accepts** (import from clipboard). Used by
agents in Krumb itself and by agents in adjacent repos (e.g. the Bear
workflow) that need to produce or transform Krumb-importable notes.

When in doubt, the implementation is the source of truth:

- Serializer: `lehi/src/lib/markdown.ts → stackToMarkdown`
- Per-item serializer (used by the "Copy as markdown" action):
  `lehi/src/lib/markdown.ts → itemToMarkdown`
- Parser: `lehi/src/lib/markdown.ts → markdownToStack`
- Diff (Stacks-tab import): `lehi/src/lib/markdown.ts → computeImportPreview`
- Diff (per-stack replace):  `lehi/src/lib/markdown.ts → computeReplacePreview`

If you change the format, change those files in the same commit.

---

## Goals

1. **Round-trip cleanly between Krumb instances** (production app, dev
   app, future devices) — the same stack moving via clipboard should
   land back on itself, not duplicate.
2. **Survive Bear** — Bear is the user's existing notes home. A stack
   exported to Bear, lightly edited, and re-imported should still parse.
3. **Read pleasantly as plain markdown** — the export is also the talk
   draft itself. No HTML-comment markers; the structure of the document
   is the format.
4. **Mirror the way talks are actually written.** A talk has an
   introduction, a principle, another principle, a closing. Sections
   are first-class.

---

## What stacks are (and aren't)

A stack is a **short-lived draft talk in motion** — typically tens of
items grouped into a handful of sections, lifecycle measured in days or
weeks, exported when shipped, then archived or deleted.

Stacks are *not* a permanent library. If that ever changes, this format
will need to grow.

---

## Structure

```markdown
# Stack title

## Section title

Optional description for this section.

### Item headline

> [Reference](url)
> 7 — verse text

Optional thought.

### Another item

note body

## Second section

Another section description.

### Item headline

> [Reference](url)
> 12 — verse text
> 13 — verse text
```

**Required:** the `# Title` line. That's the only thing the parser
absolutely needs to see.

**Heading hierarchy:**

| Level | Meaning |
|-------|---------|
| `#`   | Stack title — exactly one |
| `##`  | Section title — zero or more |
| `###` | Item headline — zero or more per section |

A stack always contains at least one section. If the imported markdown
has H3s before any H2, the parser folds them into a leading anonymous
section so they aren't lost.

---

## Identity (no markers)

The format carries **no HTML comments and no hidden identifiers.**
Identity is title-based:

- **Stack** — by `#` heading, trimmed and case-folded.
- **Section** — by `##` heading within a stack (during diff only).
- **Item** — by `###` headline within its parent section (during diff
  only).

Identity drives the **diff** in the import-preview screen. The actual
**apply** is always a full replacement: the imported markdown wins for
the matched stack's title, sections, items, and per-item contents.

### Two import entry points

| Entry point | Behavior |
|-------------|----------|
| **Stacks tab clipboard icon** | Parse → look up an existing stack by title. If matched, preview an *update*. Otherwise preview a *create*. |
| **Stack detail clipboard icon** | Parse → preview a *replace* of THIS specific stack (title match is bypassed; the user chose the target). |

Both entry points show the interstitial preview before applying.

### Trade-off (intentional)

Without per-item identity markers, **renaming an item heading reads as
"removed + added" in the diff**, not as "headline changed." Same for
section renames. The body / blockquote / thought visual is still
preserved on the new item; we just lose the rename labeling. This is
the cost of a marker-free format and we accept it.

---

## Items

The first non-empty line in an item's body determines its kind.

### Verse items

Verses are emitted as a multi-line blockquote: a header line with the
reference + URL, followed by one quoted line per verse.

```markdown
### Mosiah 4:30

> [Mosiah 4:30](https://www.churchofjesuschrist.org/.../mosiah/4?id=p30#p30)
> 30 — But this much I can tell you, that if ye do not watch yourselves…

User's commentary on this verse.
```

Recognised by:

```
header line:  /^>\s*\[([^\]]+)\]\(([^)]+)\)\s*$/
verse line:   /^>\s*(\d+)\s*[—\-.]\s*(.+)$/
```

A multi-verse set keeps the same shape with additional verse lines:

```markdown
### Alma 32:21-23

> [Alma 32:21-23](url)
> 21 — And now as I said concerning faith…
> 22 — And now, behold, I say unto you…
> 23 — And now, he imparteth his word…

Optional thought after the blockquote.
```

The parser also accepts the **legacy single-line format**
(`> [ref](url) — text`) for backward compatibility with older exports
and looser hand-edited input.

Anything after the verse blockquote, until the next `###` or `##`, is
the **thought** — the user's commentary. Verses keep `thought` as a
distinct field from the scripture text itself.

Maps to:

```ts
{ kind: 'verse', headline, reference, url, verses: VerseRef[], thought }
```

### Note items

Anything that isn't a verse blockquote is a note. Multi-line free text.

```markdown
### Build a bridge between the verses

The point is that faith is by definition incomplete knowledge — and
that's exactly what makes works the only honest test of whether the
faith is real.
```

Maps to:

```ts
{ kind: 'note', headline, body }
```

A note **does not have a separate thought field.** A note IS the user's
thought; an extra layer would be redundant.

---

## Per-item copy ("Copy as markdown")

The expanded item card has a **Copy** action that emits the same shape
the full stack export emits for that one item — `### headline`, the
verse blockquote (or note body), and the optional thought. The result
is a drop-in fragment that pastes cleanly into any Krumb stack or any
Bear note that follows the format.

---

## Type model (reference)

```ts
interface Stack {
  id: string;
  title: string;
  status: 'baking' | 'done' | 'archived';
  sectionIds: string[];
  createdAt: number;
  updatedAt: number;
}

interface Section {
  id: string;
  stackId: string;
  title: string;
  body: string;          // optional H2 description
  itemIds: string[];
  createdAt: number;
}

interface StackItemBase {
  id: string;
  stackId: string;
  headline: string;
  createdAt: number;
}

interface StackItemVerse extends StackItemBase {
  kind: 'verse';
  reference: string;
  url: string;
  standardWorkSlug: string;
  bookSlug?: string;
  chapter: number;
  verses: VerseRef[];
  thought: string;
}

interface StackItemNote extends StackItemBase {
  kind: 'note';
  body: string;
}

interface VerseRef {
  verse: number;
  text: string;          // Bear-flavored markdown for this single verse
}
```

---

## What is **not** in the format

These are deliberate omissions:

- **Stack status** (`baking` / `done` / `archived`). Local-only. On
  create-via-import, status defaults to `baking`. On
  update-via-import, the existing local status is preserved.
- **Section collapse state.** UI-only, session-scoped. Not persisted,
  not exported.
- **Item or section IDs.** No identifiers in the markdown — see
  *Identity* above.
- **Citations** (Slice 3 — BYU SCI). Not yet a kind. When added,
  expected shape is a second blockquote variant.
- **Multimedia / attachments.** Voice memos, images: future work.

---

## Inline verse formatting

Verse text inside the blockquote can carry **Bear-flavored inline
markers** that survive a round-trip:

| Style       | Marker            | Bear ⌘ shortcut |
|-------------|-------------------|-----------------|
| Bold        | `**text**`        | ⌘B              |
| Italic      | `_text_`          | ⌘I              |
| Underline   | `~text~`          | ⌘U              |
| Strikethrough | `~~text~~`      | ⌘⇧U             |
| Highlight   | `==text==`        | ⌘⇧M             |

Krumb exposes **bold, italic, underline, and highlight** in its own
selection bar inside an expanded verse item. Strikethrough is parsed
leniently (markers stripped, no visible style).

---

## For agents in adjacent repos

When generating a Krumb-importable stack from elsewhere (e.g. a Bear
workflow that condenses a longer note into a stack):

- **Always emit `# Title` as the very first heading.** Without this the
  parser throws.
- **Group items inside `## Section` blocks.** A stack always has at
  least one section. If you're generating a flat list, wrap it in one
  section.
- **`## Section` headings can be empty** (just `##` with no text), but
  prefer giving them real titles since matching uses titles.
- **Verse blockquotes need the URL** in the header line. Without it,
  the section is parsed as a note. Format: header line
  `> [Reference](url)`, then one or more `> N — text` lines.
- **The `## ` and `### ` heading text matters** — those are the
  identifiers used by the diff. Two sections with the same `##` title
  in the same stack would collide; same for two items with the same
  `###` title in the same section.
- **Don't fabricate IDs of any kind.** The format has no identifier
  fields. If you're building markdown from scratch, just emit the
  heading hierarchy.
- **Notes have no thought field.** If you want a note's body and a
  separate "thought," make two items.
