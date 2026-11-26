---
name: wiki-ingest
description: >-
  Captures a source (a URL, a file, or pasted text) into a Markdown wiki vault: an immutable copy in
  `raw/` and a page that cites it, or a dated section in a series ledger, with index and log lines,
  after one confirmation. Use when the user asks to ingest, capture, or add a source to a wiki.
---

# Wiki ingest

## When to use

**MUST** apply when the user asks to ingest, capture, clip, or add a source to a wiki, a knowledge
base, or an Obsidian vault (a folder holding `WIKI.md`), or offers a link, file, or notes to keep
there. Any other change to the vault's pages is the `wiki-maintenance` skill's job.

## Scope

- The vault: a new capture under `raw/` and the page that cites it, or a series ledger; its
  `index.md`; and the area's log.
- Reads the source through the tools the session already has.

## Inputs

- One source, or a batch of them: a URL, a file path, or pasted text. One export may hold several
  occurrences of a series, such as a list of meeting summaries.
- Optional: the topic folder, a page title, and a dry run that stops after the plan.

## Fetch

Read the source with what the session already has: a web fetch for a public page, the system's own
MCP server or connector for a private one (a document store, a chat, a ticket tracker), or a file
read for a local file. Never ask for a token or call a private API directly. When nothing can read
it, ask the user to paste or export it. An empty or unreadable source stops the run; never write an
empty page.

## Ledgers

A recurring series, such as a meeting, a review, or a report, can keep one page with a dated section
per occurrence instead of a capture and a page each. Only the schema turns this on: it names the
kinds of source that go to a ledger and the folder ledgers live in. Its own section format and rules
win over the defaults below.

- **One ledger per series**: `<ledgers folder>/<series>.md`, the slug from the series title without
  its date. The first occurrence creates it from `_templates/page.md`: an opening paragraph on the
  series, its standing cast, and how to fetch an occurrence again, and `sources` naming where the
  series lives. It gets an `index.md` line then; later occurrences leave the index alone.
- **One section per occurrence**, newest last: `## YYYY-MM-DD — <topic>`, then a `Reference` line
  (where the original is, its length, who attended beyond the standing cast, and `Omitted:` notes),
  the decisions that stay true, and `Actions:` with each owner. No narration, no verbatim text, and
  no `- [ ]` checkboxes: actions record what was committed; live work goes where the vault keeps
  tasks.
- **No capture**: nothing goes to `raw/`, so the `Reference` line must be enough to fetch the
  original again.
- **Series and date are the key**: a second ingest of an occurrence rewrites its section in place.
  When the ledger already holds a section on that date, the plan says whether the source is that
  occurrence (rewrite) or another one the same day (a new section beside it).
- **Many in one source**: an export holding several occurrences, of one series or several, is split
  into them; the plan lists each with its ledger, and one confirmation covers them all.
- **Log**: one `## [<today>] ingest | <series> — <date>` entry per occurrence.

## Workflow

1. Read the vault's `WIKI.md`. Where it differs from this skill (layout, page kinds, frontmatter,
   logs, ledgers), the schema wins.
2. Fetch the source.
3. Classify it against the schema's § Sensitivity. Keep exact excluded values for local redaction
   and verification only. A source URL whose query or fragment carries a token, key, or signature is
   recorded without it. Keep the neutral takeaway, and note `Omitted: <what kind>` on the page.
4. Plan, without writing. A source the schema sends to a ledger plans each occurrence instead: its
   ledger, new or existing; whether its section is new or rewritten ([§ Ledgers](#ledgers)); a new
   ledger's `index.md` line; and the log entry. Any other source plans:
   - the topic folder, from the user or the closest existing topic; a new topic is named in the
     plan;
   - a kebab-case `<slug>` from the title;
   - the capture path, `raw/<topic>/<YYYY-MM-DD>-<slug>.<ext>`, with `-2` added when it exists;
   - the page: a new `<topic>/<slug>.md`, or the existing page on the same subject to update (search
     titles, tags, and text first; prefer updating to a near-duplicate);
   - the page's tags, per the schema's § Tags: tags already on the vault's pages first, a new one
     only for a distinction none of them makes;
   - the `index.md` line and the log entry.
5. Show the plan and the categories and counts of exclusions. Keep the exact values out of messages,
   logs, and delegated inputs. Ask once. A dry run stops here; a batch gets one plan and one answer.
6. Write. A ledger occurrence writes its section, sets the ledger's `updated` to today, adds a new
   ledger's `index.md` line, and writes its log entry. Any other source writes:
   - the capture: the source as fetched, minus the omitted strings, never edited afterwards; a
     Markdown capture opens with `source` (the URL or file) and `captured` (today) frontmatter;
   - the page from `_templates/page.md`: `title`, `created`, `updated`, the planned `tags`, and
     `sources` listing the capture path and the source URL; a summary first, then claims, each
     backed by a source, and vault-root links to related pages;
   - on an existing page: the new claims with their source, a contradicted claim moved under
     `## Superseded` (never deleted), `updated` set to today, the capture added to `sources`, and
     any planned tag it lacks;
   - the page's line in its topic `index.md`, and a new topic's link in the home `index.md`;
   - `## [<today>] ingest | <title>` at the bottom of the log.

   Log entries go to the log the schema names for the page's area: the vault's `log.md`, unless the
   schema names a log per area; then none for an area it gives no log.

7. Locally check every file the run wrote (captures, pages, indexes, and the log, frontmatter
   included) for excluded values. Remove any that slipped through without printing matches.
8. Run the `wiki-lint` skill and fix every failure the run caused.

## Rules

- Outside a ledger, one source makes one capture. A newer version of a source is a new capture,
  cited next to the older one.
- Distilling and deciding what stays out are judgment: run them on the strongest model the session
  has. In a large batch, a faster sub-agent may write the captures and pages from the confirmed plan
  and source material already redacted by the primary agent. Step 7 stays with the primary agent.
