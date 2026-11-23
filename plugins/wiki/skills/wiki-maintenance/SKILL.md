---
name: wiki-maintenance
description: >-
  Answers questions from a Markdown wiki with citations, reviews its content, and maintains pages
  and links. Use for vault questions or edits other than ingest. Save an answer only when asked.
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

Read the vault's `WIKI.md` first and follow its schema for any write. A question or review is
read-only unless the user asks to save an answer or apply an edit. After a write, add
`## [<today>] <op> | <title>` to the log and run `wiki-lint` for the changes.

| Operation | Steps                                                                                     | Op          |
| --------- | ----------------------------------------------------------------------------------------- | ----------- |
| Query     | Answer from the pages and cite them                                                       | —           |
| Update    | Add the new claim with its source, supersede the old one, set `updated` to today          | `update`    |
| Supersede | Move a claim that is no longer true under `## Superseded` with the date; never delete it  | `supersede` |
| Move      | Move or rename the page, then rewrite every link to its old vault-root path               | `move`      |
| Merge     | Move the duplicate's claims and `sources` into the page kept, re-point its links, drop it | `move`      |
| Drop      | Remove a page only on the user's yes, with its index line and every link to it            | `drop`      |
| New topic | Create `<topic>/index.md`, link it from the home `index.md` and the schema's topic list   | `create`    |

- **Filing back** requires an explicit request to save the answer. Create or update a page with the
  sources of the pages the answer rests on and log the write. An answer with no source stays in the
  chat.
- **Links**: find every link to a moved or dropped page by searching the vault for its vault-root
  path, with and without `.md`, and fix each one in the same change. In past log entries only the
  target changes: the new path for a move, the link's text alone for a drop.
- **Tags**: every page written follows the schema's § Tags; a merge keeps both pages' tags, less any
  synonym of a tag already kept.
- **One writer per file**: edit one page at a time, and never reorder or reword past log entries.

## Review

When the user asks for a review:

1. Run the `wiki-lint` skill; its orphans and uncited captures are the first findings.
2. Add what the script cannot see:
   - pages with no `sources`, or whose sources no longer back their claims;
   - pages on the same subject that should merge;
   - claims that contradict each other across pages;
   - tags that mean the same (synonyms, spelling variants, singular and plural) or repeat a topic
     folder, listed with each tag's page count and the one to keep; a rare tag is not wrong by
     itself;
   - pages whose `updated` is the oldest, with the newest capture on their subject when it is later.
3. Report the findings as a numbered list, each with the operation that closes it.
4. Apply only the numbers the user picks, then log `## [<today>] update | Review` with the counts.
