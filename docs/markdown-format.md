# Krumb Markdown Format

Canonical spec for the markdown shape that Krumb both **emits** (export
to clipboard / Bear) and **accepts** (import from clipboard). Used by
agents in Krumb itself and by agents in adjacent repos (e.g. the Bear
workflow) that need to produce or transform Krumb-importable notes.

When in doubt, the implementation is the source of truth:

- Serializer: `lehi/src/lib/markdown.ts → stackToMarkdown`
- Parser: `lehi/src/lib/markdown.ts → markdownToStack`
- Diff: `lehi/src/lib/markdown.ts → computeImportPreview`

If you change the format, change those files in the same commit.

---

## Goals

1. **Round-trip cleanly between Krumb instances** (production app on
   phone, dev app on phone, future devices) — the same stack moving via
   clipboard should land back on itself, not duplicate.
2. **Survive Bear** — Bear is the user's existing notes home. A stack
   exported to Bear, lightly edited, and re-imported should still parse.
3. **Read pleasantly as plain markdown** — the export is also the talk
   draft itself. Markers must be invisible in any rendered view.
4. **Layout-driven** — the structure of the markdown is what conveys
   meaning. The two HTML-comment markers carry identity only; they
   never separate content from content.

---

## What stacks are (and aren't)

A stack is a **short-lived draft talk in motion** — typically tens of
items, lifecycle measured in days or weeks, exported when shipped, then
archived or deleted. The format is shaped for that.

Stacks are *not* a permanent library, a tag-driven knowledge base, or a
Zettelkasten. If that ever changes, this format will need to grow
(per-item versioning, per-stack tags, etc). Today it does not.

---

## Structure

```markdown
<!-- krumb:stack:{stack-id} -->
# {Stack title}

<!-- krumb:item:{item-id} -->
## {Headline}

{Item body}

<!-- krumb:item:{item-id} -->
## {Headline}

{Item body}
```

**Required:** the `# {title}` line. That's the only thing the parser
absolutely needs to see.

**Optional but emitted on export:**

- `<!-- krumb:stack:{stack-id} -->` — stack-level identity for
  round-trips. See *Round-trip identity*.
- `<!-- krumb:item:{item-id} -->` — per-item identity. Lets the import
  preview compute a diff and lets us preserve `createdAt` on items that
  survived a round-trip.

---

## Markers

HTML comments are preserved by Bear (and by every common markdown
renderer), and they render as nothing visible.

### `<!-- krumb:stack:{id} -->`

Emitted as the very first line of the export. The `{id}` is the
producing stack's local ID. On import:

| Marker present? | Stack with that ID exists locally? | Result |
|-----------------|------------------------------------|--------|
| Yes             | Yes                                | **Update** the existing stack. |
| Yes             | No                                 | **Create** with the same ID. (Prod ↔ dev sync — same stack, different app instances.) |
| No              | —                                  | **Create** with a fresh ID. |

### `<!-- krumb:item:{id} -->`

Emitted immediately before each `## ` heading, on its own line. Lets
the parser reattach an imported item to its existing local twin so:

- Unchanged items keep their original `createdAt`.
- The import-preview diff can show "X unchanged / Y changed / Z added /
  W removed" by ID rather than by guessing.

If the marker is absent (Bear-edited variant where the user typed a
brand-new `## ` section without the comment), the item is treated as
new on import.

### What the format does **not** carry

- **No body/thought separator marker.** Layout determines body and
  thought — see *Items* below.
- **No item-kind marker.** Kind is detected from layout: a section
  whose first non-empty line is a verse blockquote is a verse;
  otherwise it's a note.

---

## Items

Each item is a `## ` section. The `## ` heading text is the
**headline** — a user-editable label, defaulted from the item's content
on first creation. Examples:

- For a verse: defaults to the reference (e.g. `## Mosiah 4:30`).
- For a note: defaults to the first line of the body.

The user can edit the headline freely; the parser treats whatever's in
the heading as the headline. The parser also strips a leading decorative
number (`1. `, `12. `) — the export doesn't emit those today, but the
parser tolerates them.

### Verse items

The first non-empty line in the section body is a markdown blockquote
of the form:

```markdown
> [{reference}]({url}) — {verse text}
```

Recognised by the regex:

```
/^>\s*\[([^\]]+)\]\(([^)]+)\)\s*[—-]\s*(.+)$/
```

(Em-dash `—` is preferred but a hyphen `-` also matches, to be tolerant
of editors that auto-substitute.)

Anything after the blockquote line — until the next `## ` heading — is
the **thought**: the user's commentary on the verse. Verses keep
`thought` as a distinct field because the verse text is bounded
scripture, not the user's reflection on it.

Maps to:

```ts
{ kind: 'verse', headline, reference, url, verseText, thought }
```

### Note items

Anything else — free-text body. Multi-line is fine. The body can include
its own blockquotes, lists, etc. — anything that isn't a `## ` heading
is treated as part of the body.

A note **does not** have a separate "thought" field. A note IS the
user's thought; an extra layer would be redundant.

Maps to:

```ts
{ kind: 'note', headline, body }
```

---

## Example (clean round-trip export)

```markdown
<!-- krumb:stack:lph9q1xv_a8b3kf2 -->
# Faith without works

<!-- krumb:item:item_001 -->
## James 2:17

> [James 2:17](https://www.churchofjesuschrist.org/study/scriptures/nt/james/2.17) — Even so faith, if it hath not works, is dead, being alone.

The whole letter circles this. "Show me thy faith without thy works,
and I will show thee my faith by my works."

<!-- krumb:item:item_002 -->
## Alma 32:21

> [Alma 32:21](https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/32.21) — And now as I said concerning faith—faith is not to have a perfect knowledge of things; therefore if ye have faith ye hope for things which are not seen, which are true.

<!-- krumb:item:item_003 -->
## Build a bridge here

This note is the bridge between the two scriptures. The point is that
faith is by definition incomplete knowledge — and that's exactly what
makes works the only honest test of whether the faith is real.

Maybe end on Heb 11:1 if there's time.
```

Item 1 (verse) has both verse text and a thought. Item 2 (verse) has no
thought, so the section is just the blockquote. Item 3 (note) is purely
body — the headline "Build a bridge here" is editable; the parser uses
whatever's in the `## ` heading.

---

## Example (Bear-edited variant)

The user opens the above in Bear, fixes the thought on item 1, deletes
item 2 entirely, and adds a brand-new note at the end. Re-importing:

```markdown
<!-- krumb:stack:lph9q1xv_a8b3kf2 -->
# Faith without works

<!-- krumb:item:item_001 -->
## James 2:17

> [James 2:17](...) — Even so faith, if it hath not works, is dead, being alone.

The whole letter circles this. Faith without works isn't faith at all
— it's wishful thinking dressed up.

<!-- krumb:item:item_003 -->
## Build a bridge here

This note is the bridge — faith is by definition incomplete knowledge.

## Closing thought

End on the practical: this week, what's one act of works to test our
faith?
```

Import preview will show:

- **Changed:** "James 2:17" (thought rewritten)
- **Removed:** "Alma 32:21" (no longer in the markdown)
- **Unchanged:** "Build a bridge here"
- **Added:** "Closing thought" (no `krumb:item` marker → treated as new)

The user confirms; the local stack updates accordingly.

---

## Type model

```ts
interface StackItemBase {
  id: string;
  stackId: string;
  headline: string;     // user-editable
  createdAt: number;
}

interface StackItemVerse extends StackItemBase {
  kind: 'verse';
  reference: string;
  url: string;
  verseText: string;    // the scripture itself
  thought: string;      // user's commentary
}

interface StackItemNote extends StackItemBase {
  kind: 'note';
  body: string;         // the note IS the thought
}
```

---

## What is **not** in the format (today)

These are deliberate omissions, listed so future agents don't try to
infer them:

- **Stack status** (`baking` / `done` / `archived`). Not encoded. On
  create-via-import, status defaults to `baking`. On
  update-via-import, the existing local status is preserved. Status is
  intentionally a local concern — Bear doesn't have a notion of it,
  and round-trips shouldn't second-guess what the user marked locally.
- **Citations** (Slice 3 — BYU SCI). Not yet a kind. When added,
  expected shape is a second blockquote variant, e.g.
  `> *Talk Title* — Speaker, October 2014` with its own URL.
- **Per-item ordering markers.** Order is positional in the markdown.
- **Multimedia / attachments.** Voice memos, images: future work.

---

## For agents in adjacent repos

When generating a Krumb-importable stack from elsewhere (e.g. a Bear
workflow that condenses a longer note into a stack):

- **Don't fabricate a `krumb:stack:` marker.** If you don't have a real
  stack ID from Krumb, omit the marker entirely. The import will create
  a fresh stack. Inventing an ID risks silently overwriting an
  unrelated existing stack on import.
- **Don't fabricate `krumb:item:` markers either.** Without a real
  item ID, omit the marker. Krumb will treat the item as new and assign
  one on apply.
- **Always emit `# Title` as the very first heading.**
- **Verse blockquotes need the URL.** It's the link out to Gospel
  Library. Without it, the section is parsed as a note, not a verse.
  Format: `> [Reference](url) — exact verse text`.
- **The `## ` heading text is the headline.** If you set a meaningful
  one, the user will see it in the import preview and on the item
  card.
- **Notes have no thought field.** If you want a note's body and a
  separate "thought," make two items — one note for the thought, one
  whatever for the rest.
