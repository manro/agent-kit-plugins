---
name: wiki-maintenance
description: >-
  Keeps a Markdown wiki vault true and connected: answers from its pages and files the answer back,
  updates and supersedes claims, moves, merges, and drops pages with their links, and reviews it for
  stale, duplicate, or uncited content. Use when changing a vault's pages other than by ingest.
---

# Wiki maintenance

## When to use

**MUST** apply when answering a question from a wiki vault (a folder holding `WIKI.md`), when
changing its pages in any way other than ingesting a source, and when the user asks to review, tidy,
or clean up a wiki's content. A new source is the `wiki-ingest` skill's job; the vault's setup and
schema are `wiki-config`'s.

## Scope

- The vault's pages, topic indexes, and `log.md`. Captures in `raw/` are read, never edited.

## Operations

Read the vault's `WIKI.md` first; where it differs from this skill, the schema wins. Each operation
ends with its log entry, `## [<today>] <op> | <title>`, and a `wiki-lint` run whose failures are
fixed.

| Operation | Steps                                                                                     | Op          |
| --------- | ----------------------------------------------------------------------------------------- | ----------- |
| Query     | Answer from the pages and cite them; when the answer will be asked again, file it back    | `create`    |
| Update    | Add the new claim with its source, supersede the old one, set `updated` to today          | `update`    |
| Supersede | Move a claim that is no longer true under `## Superseded` with the date; never delete it  | `supersede` |
| Move      | Move or rename the page, then rewrite every link to its old vault-root path               | `move`      |
| Merge     | Move the duplicate's claims and `sources` into the page kept, re-point its links, drop it | `move`      |
| Drop      | Remove a page only on the user's yes, with its index line and every link to it            | `drop`      |
| New topic | Create `<topic>/index.md`, link it from the home `index.md` and the schema's topic list   | `create`    |

- **Filing back** a query writes a page or an update whose `sources` are the sources of the pages
  the answer rests on; an answer with no source stays in the chat.
- **Links**: find every link to a moved or dropped page by searching the vault for its vault-root
  path, with and without `.md`, and fix each one in the same change. In past log entries only the
  target changes: the new path for a move, the link's text alone for a drop.
- **One writer per file**: edit one page at a time, and never reorder or reword past log entries.

## Review

When the user asks for a review, or the log shows none for a long while:

1. Run the `wiki-lint` skill; its orphans and uncited captures are the first findings.
2. Add what the script cannot see:
   - pages with no `sources`, or whose sources no longer back their claims;
   - pages on the same subject that should merge;
   - claims that contradict each other across pages;
   - pages whose `updated` is the oldest, with the newest capture on their subject when it is later.
3. Report the findings as a numbered list, each with the operation that closes it.
4. Apply only the numbers the user picks, then log `## [<today>] update | Review` with the counts.
