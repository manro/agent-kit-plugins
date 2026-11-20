---
name: wiki-lint
description: >-
  Lints a Markdown wiki vault against its `WIKI.md` schema: page names and frontmatter, vault-root
  links, wikilinks, orphans, log headings, and line width. Use after any change under a vault, when
  asked to lint or check a wiki, or after `wiki-config` creates or updates one.
---

# Wiki lint

## When to use

**MUST** apply after any change under a wiki vault (a folder holding `WIKI.md`), and when the user
asks to lint, check, or health-check a wiki or knowledge base.

## Scope

- The vault folder, read only. The script reports; the agent fixes.

## Run

From the repository root, with Node 22 or later:

```bash
node <this skill's folder>/scripts/dist/wiki-lint.run.mjs --plain --vault <folder> --line-width <chars>
```

`--vault` defaults to `wiki`. Pass `--line-width` when the vault's `WIKI.md` names one; without it
no line is too long.

## What it checks

A vault is a folder holding `WIKI.md`. Every `.md` file in it is a note, except those under any
`raw/` folder (immutable captures, counted only), any folder starting with `_` (templates), and the
vault's top `assets/`, `.obsidian/`, and `.trash/`. A note named `index.md`, `log.md`, `WIKI.md`,
`AGENTS.md`, `CLAUDE.md`, or `README.md` is not a page; every other note is.

| Check                                                                     | Notes | Level   |
| ------------------------------------------------------------------------- | ----- | ------- |
| `[[wikilink]]` outside an `![[embed]]`                                    | all   | failure |
| `./` or `../` link                                                        | all   | failure |
| Vault link that resolves to no file, or lacks `.md`                       | all   | failure |
| `/`-rooted link to a repository path that does not exist                  | all   | failure |
| Line past `--line-width` that could wrap (fences, tables, frontmatter OK) | all   | failure |
| File name not kebab-case `.md`                                            | pages | failure |
| No frontmatter, or no `title`, `created`, or `updated`                    | pages | failure |
| `created` or `updated` not `YYYY-MM-DD`                                   | pages | warning |
| No `sources`                                                              | pages | warning |
| Orphan: no index or other page links to it (a log entry does not count)   | pages | warning |
| `##` heading in a `log.md` not `## [YYYY-MM-DD] <op> \| <title>`          | logs  | warning |

Links inside fenced blocks and inline code are examples and are not checked. A failure names the
other path when a file of the same name exists elsewhere in the vault.

## Workflow

1. Run the script and read its report: failures, warnings, then the counts.
2. Fix every failure in the notes the current change touched. List the other failures to the user
   rather than fixing notes outside the change.
3. Fix a warning when the fix is plain (a missing `sources` entry the page already cites, an index
   line for an orphan); report the rest.
4. Rerun until the status is `PASS`.

| Exit | Meaning                                     |
| ---- | ------------------------------------------- |
| 0    | `PASS`: no failures; warnings may remain    |
| 1    | Bad arguments, or no `WIKI.md` at `--vault` |
| 2    | `FAIL`: at least one failure is left to fix |

## Scripts

`scripts/` is a package, `@manro/agent-kit-skill-wiki-lint`, laid out like an app
(`code-architecture` § Package anatomy) and run by plain Node: code in `src/`, suites in `test/`.
Paths below are under `src/`.

| Path                              | Holds                                                        |
| --------------------------------- | ------------------------------------------------------------ |
| `wiki-lint.run.ts`                | The entry: runs `LintCommand` and prints its report          |
| `cli/commands/lint.command.ts`    | Parses the flags, wires the checkers, prints, picks the exit |
| `cli/lint-report-formatter.ts`    | The report as lines                                          |
| `base/fs-vault-reader.adapter.ts` | The vault on disk: notes, raw count, path checks             |
| `core/note/`                      | Frontmatter parser, Markdown scanner, note classifier        |
| `core/check/`                     | `LinkChecker` over all notes, `NoteChecker` over one note    |
| `core/composer/wiki-linter.ts`    | `WikiLinter`: runs both and finds the orphans                |
