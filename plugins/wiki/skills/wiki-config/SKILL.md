---
name: wiki-config
description: >-
  Creates a Markdown knowledge-base vault (raw captures, topic pages, a `WIKI.md` schema) that opens
  in Obsidian, or compares an existing vault with the template and applies the improvements the user
  picks. Use when asked to set up a wiki, or to review or improve a vault's setup or schema.
---

# Wiki config

## When to use

**MUST** apply when the user asks to create or set up a wiki, a knowledge base, or an Obsidian vault
in a repository, or to review or improve an existing vault's setup or schema. Checking a vault's
pages is the `wiki-lint` skill's job.

## Scope

- The vault folder and everything in it.
- One pointer line in the repository's root agent instructions, and the `.gitignore` entries for
  Obsidian's per-user files.

## Template

`assets/vault/` is the vault as created, with placeholders in double braces:

| File                                        | Holds                                                         |
| ------------------------------------------- | ------------------------------------------------------------- |
| `assets/vault/WIKI.md`                      | The schema: layers, layout, page format, links, log, the loop |
| `assets/vault/AGENTS.md`                    | Points an agent working inside the vault at `WIKI.md`         |
| `assets/vault/index.md`                     | The vault home, linking each topic index                      |
| `assets/vault/log.md`                       | The append-only log, with no entries yet                      |
| `assets/vault/_templates/`                  | `page.md`, the page every new page starts from                |
| `assets/vault/.obsidian/`                   | `app.json`: Markdown links, vault-root paths, `assets/`       |
| `assets/vault/raw/`, `assets/vault/assets/` | Empty folders, kept by `.gitkeep`                             |

| Placeholder           | Becomes                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `{{vault}}`           | The vault folder, relative to the repository root                                     |
| `{{date}}`            | Today, `YYYY-MM-DD`                                                                   |
| `{{purpose}}`         | One sentence on what the vault holds, in the user's words                             |
| `{{topic-links}}`     | One `- [Topic](topic/index.md): what it holds` line per topic                         |
| `{{topic-list}}`      | One line per topic under the layout tree: the folder in backticks, then what it holds |
| `{{line-width-note}}` | `, and lines past N columns` with the width, or nothing without one                   |

## Workflow

Find the vault first: a folder the user names, or a folder holding `WIKI.md` that the root agent
instructions point at. With none, create one; with one, improve it.

### Create

1. Ask the user, in one message, for what the defaults do not settle:
   - the folder, `wiki/` by default;
   - the topics, as two to six kebab-case folder names, each with one line on what it holds;
   - one sentence on the vault's purpose;
   - the prose line width, if the repository holds Markdown to one (its `.editorconfig`
     `max_line_length` or Prettier's `printWidth` for Markdown); none by default.
2. Stop if the folder exists and is not empty; ask whether to use another folder or improve the
   vault already there.
3. Copy `assets/vault/` into the folder, dotfiles included, and replace every placeholder.
4. For each topic, create `<topic>/index.md` with `title` and `updated` frontmatter, a `#` heading,
   its one line, and an empty `## Pages` section.
5. Append the first log entry: `## [<today>] create | Vault created`, with the topics in a line
   below it.
6. Add `<vault>/.obsidian/workspace*.json` and `<vault>/.trash/` to the repository's `.gitignore`.
7. Add one line to the repository's root agent instructions (`AGENTS.md`, or `CLAUDE.md` when it is
   the only one) that names the vault and points at `<vault>/WIKI.md`. When the repository loads
   `CLAUDE.md` files and not `AGENTS.md`, also create `<vault>/CLAUDE.md` holding `@AGENTS.md`.
8. Run the `wiki-lint` skill over the new vault, passing the line width when there is one, and fix
   every failure before reporting.

### Improve

1. Read the vault's `WIKI.md` and compare the vault with the template, one row per gap:

   | Area       | A gap                                                                      |
   | ---------- | -------------------------------------------------------------------------- |
   | Files      | A template file or folder the vault lacks                                  |
   | Schema     | A template `WIKI.md` section with no counterpart in the vault's schema     |
   | Rules      | A schema rule `wiki-lint` contradicts: relative links, wikilinks, headings |
   | Topics     | A topic folder without `index.md`, or one the home `index.md` misses       |
   | Obsidian   | An `.obsidian/app.json` setting that differs from the template's           |
   | Repository | A missing `.gitignore` entry, pointer line, or import (Create steps 6, 7)  |
   | Lint       | Each failure the `wiki-lint` skill reports, and a count of its warnings    |

2. Report the gaps as a numbered list: what is missing or differs, and the change that closes it.
   Name a section the vault holds and the template lacks (its own page kinds, people, tasks) as the
   vault's own; it is never a gap.
3. Apply only the numbers the user picks. Add a missing schema section from the template, adapted to
   the vault's folders and names; never rewrite or remove the vault's own text or pages.
4. Append `## [<today>] update | Vault config updated` to the log, listing what changed.
5. Run the `wiki-lint` skill and fix every failure the change caused.

## Rules

- The vault holds no tool configuration beyond `.obsidian/app.json`; never install anything into a
  tool's own settings.
- Keep the schema's rules as they are when creating; a repository that needs more page kinds adds a
  section to its own `WIKI.md`, which Improve then keeps.
- Prose that Prettier formats elsewhere in the repository stays formatted the same way here; when
  the repository's Prettier skips the vault, wrap by hand to the line width.
