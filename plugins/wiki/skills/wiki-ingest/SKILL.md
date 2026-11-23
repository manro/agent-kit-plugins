---
name: wiki-ingest
description: >-
  Captures a source (a URL, a file, or pasted text) into a Markdown wiki vault: an immutable copy in
  `raw/`, a page that distils and cites it, its index line, and a log entry, after one confirmation.
  Use when the user asks to ingest, capture, or add a source to a wiki or knowledge base.
---

# Wiki ingest

## When to use

**MUST** apply when the user asks to ingest, capture, clip, or add a source to a wiki, a knowledge
base, or an Obsidian vault (a folder holding `WIKI.md`), or offers a link, file, or notes to keep
there. Any other change to the vault's pages is the `wiki-maintenance` skill's job.

## Scope

- The vault: a new capture under `raw/`, the page that cites it, its topic `index.md`, and `log.md`.
- Reads the source through the tools the session already has.

## Inputs

- One source, or a batch of them: a URL, a file path, or pasted text.
- Optional: the topic folder, a page title, and a dry run that stops after the plan.

## Fetch

Read the source with what the session already has: a web fetch for a public page, the system's own
MCP server or connector for a private one (a document store, a chat, a ticket tracker), or a file
read for a local file. Never ask for a token or call a private API directly. When nothing can read
it, ask the user to paste or export it. An empty or unreadable source stops the run; never write an
empty page.

## Workflow

1. Read the vault's `WIKI.md`. Where it differs from this skill (layout, page kinds, frontmatter),
   the schema wins.
2. Fetch the source.
3. Classify it against the schema's § Sensitivity. Keep exact excluded values for local redaction
   and verification only. A source URL whose query or fragment carries a token, key, or signature is
   recorded without it. Keep the neutral takeaway, and note `Omitted: <what kind>` on the page.
4. Plan, without writing:
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
6. Write:
   - the capture: the source as fetched, minus the omitted strings, never edited afterwards; a
     Markdown capture opens with `source` (the URL or file) and `captured` (today) frontmatter;
   - the page from `_templates/page.md`: `title`, `created`, `updated`, the planned `tags`, and
     `sources` listing the capture path and the source URL; a summary first, then claims, each
     backed by a source, and vault-root links to related pages;
   - on an existing page: the new claims with their source, a contradicted claim moved under
     `## Superseded` (never deleted), `updated` set to today, the capture added to `sources`, and
     any planned tag it lacks;
   - the page's line in its topic `index.md`, and a new topic's link in the home `index.md`;
   - `## [<today>] ingest | <title>` at the bottom of `log.md`.
7. Locally check every file the run wrote (captures, pages, indexes, and the log, frontmatter
   included) for excluded values. Remove any that slipped through without printing matches.
8. Run the `wiki-lint` skill and fix every failure the run caused.

## Rules

- One source makes one capture. A newer version of a source is a new capture, cited next to the
  older one.
- Distilling and deciding what stays out are judgment: run them on the strongest model the session
  has. In a large batch, a faster sub-agent may write the captures and pages from the confirmed plan
  and source material already redacted by the primary agent. Step 7 stays with the primary agent.
