---
title: Wiki Schema
updated: "{{date}}"
---

# Wiki Schema

How this vault is layered, what a page looks like, and how agents and people read and write it. Read
it before adding or moving any file under `{{vault}}/`.

The vault is plain Markdown with YAML frontmatter. It opens as an Obsidian vault rooted at
`{{vault}}/`, and every file stays readable and writable without Obsidian.

## Layers

1. **`raw/`**: immutable source captures, such as clipped pages, exported documents, transcripts,
   and pasted notes. A capture is never edited; a newer version is a new file.
2. **Pages**: distilled knowledge in topic folders, kept current by agents and people. Every claim
   cites a capture in `raw/` or an outside URL.
3. **This schema**: the conventions, and the ingest, query, and lint loop that keeps the pages true
   to their sources.

## Layout

```text
{{vault}}/
├── WIKI.md          # this schema
├── AGENTS.md        # points agents working in the vault here
├── index.md         # home: links each topic index
├── log.md           # append-only activity log
├── raw/             # immutable captures, raw/<topic>/<YYYY-MM-DD>-<slug>.<ext>
├── assets/          # attachments
├── _templates/      # page.md
└── <topic>/         # index.md plus the topic's pages
```

{{topic-list}}

## Pages

A page is any Markdown file outside `raw/`, `assets/`, and folders starting with `_` (such as
`_templates/`), other than `WIKI.md`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `index.md`, and
`log.md`. Its file name is kebab-case (`release-process.md`), and it starts from
`_templates/page.md`:

| Field               | Required | Holds                                                   |
| ------------------- | -------- | ------------------------------------------------------- |
| `title`             | yes      | The page title, also its `#` heading                    |
| `created`/`updated` | yes      | `YYYY-MM-DD`; `updated` moves with every content change |
| `sources`           | expected | `raw/` captures or URLs the claims rest on              |
| `tags`              | no       | Free-form labels                                        |

## Links

- Link with a Markdown link and a vault-root path, with no leading slash and with the `.md`
  extension: `[Release process](engineering/release-process.md)`. Obsidian resolves it from any
  folder, so never write `../` or `./`. A heading adds its anchor (`…/release-process.md#steps`).
- A leading slash points at a repository file outside the vault (`/README.md`).
- No `[[wikilinks]]`. Embeds stay `![[file.png]]`, pointing into `assets/`.
- Every page is linked from its topic `index.md` or from another page; a page nothing links to is an
  orphan.

## Log

`log.md` is append-only, newest entry last. Each entry is a heading
`## [YYYY-MM-DD] <op> | <title>`, with any detail in a paragraph under it. `<op>` is a short
lowercase verb: `create`, `ingest`, `update`, `supersede`, `move`, `drop`. Past entries are never
reordered or reworded; the one edit they take is a link target: a moved page's new path, or plain
text for a dropped page.

## Ingest, query, lint

- **Ingest** (the `wiki-ingest` skill): save the source to `raw/`, write or update the page that
  cites it, list the page in its topic `index.md`, and append a log entry.
- **Query** (the `wiki-maintenance` skill, with every other change to pages): answer from the pages
  and cite them. When the answer will be asked again, file it back as a page or an update, so the
  next query is cheaper.
- **Lint**: run the `wiki-lint` skill after every change. It checks page names and frontmatter,
  links, orphans, uncited captures, and log headings{{line-width-note}}.

## Provenance and supersede

- Every claim traces to a `sources` entry.
- Correct a page by adding the new statement and marking the old one `> Superseded YYYY-MM-DD: …`
  under `## Superseded`, not by deleting it.

## Concurrent writers

- One writer per file in a run: an agent edits one page at a time.
- Logs only grow at the bottom, so additions from two branches merge.
- Supersede rather than rewrite, so two updates to one fact both stay visible.

## Sensitivity

The vault is committed with the repository. Keep out credentials, tokens, and personal data that
should not live in shared git; leave a pointer to where they live instead.
