---
name: wiki-lint
description: >-
  Lints a Markdown wiki vault against its `WIKI.md` schema: page names and frontmatter, vault-root
  links, wikilinks, orphans, uncited captures, log headings, and line width. Use after any change
  under a vault, when asked to lint or check a wiki, or after `wiki-config` creates or updates one.
---

# Wiki lint

## When to use

**MUST** apply after any change under a wiki vault (a folder holding `WIKI.md`), and when the user
asks to lint, check, or health-check a wiki or knowledge base.

## Scope

- The vault folder, read only. The script reports; the agent fixes.

## Repository facts

- **The vault's own check**: when the vault's `WIKI.md` names its own lint command, such as a
  package script, that command is the vault's health check. Run it in place of this script and read
  its report; any exit other than 0 means work is left. [§ What it checks](#what-it-checks) and the
  exit codes then describe only this script.
- **Checks its conventions do not hold**: where `WIKI.md` exempts a kind of note from a check, such
  as tasks or chat profiles that cite no sources, or logs whose old entries run past the line width,
  that check is off for those paths. A vault whose own command runs this script passes the switches
  there.

## Run

From the repository root, with Node 22 or later:

```bash
node <this skill's folder>/scripts/dist/wiki-lint.run.mjs --plain --vault <folder> --line-width <chars>
```

`--vault` defaults to `wiki`. Pass `--line-width` when the vault's `WIKI.md` names one; without it
no line is too long.

`--off <name>` turns a check off, and `--off <name>=<glob>` only for the vault paths the glob
matches and the files under them: `*` stays within one folder, a `**` segment spans any, so
`--off 'sources=people/*/tasks'` covers every person's tasks. Repeat it for each switch; a name the
table does not list is a usage error.

## What it checks

A vault is a folder holding `WIKI.md`. Every `.md` file in it is a note, except those under any
`raw/` folder (immutable captures, checked only for a citation), any folder starting with `_`
(templates), and the vault's top `assets/`, `.obsidian/`, and `.trash/`. A note named `index.md`,
`log.md`, `WIKI.md`, `AGENTS.md`, `CLAUDE.md`, or `README.md` is not a page; every other note is.

| Check                                                                     | Name            | Notes | Level   |
| ------------------------------------------------------------------------- | --------------- | ----- | ------- |
| `[[wikilink]]` outside an `![[embed]]`                                    | `wikilink`      | all   | failure |
| `./` or `../` link                                                        | `relative-link` | all   | failure |
| Vault link not URL-encoded, resolving to no file, or lacking `.md`        | `link`          | all   | failure |
| `/`-rooted link to a repository path that does not exist                  | `repo-link`     | all   | failure |
| Line past `--line-width` that could wrap (fences, tables, frontmatter OK) | `line-width`    | all   | failure |
| File name not kebab-case `.md`                                            | `file-name`     | pages | failure |
| No frontmatter, or no `title`, `created`, or `updated`                    | `frontmatter`   | pages | failure |
| `created` or `updated` not `YYYY-MM-DD`                                   | `date`          | pages | warning |
| No `sources`                                                              | `sources`       | pages | warning |
| `tags` not a list of unique lowercase kebab-case words (none is fine)     | `tags`          | pages | warning |
| Orphan: no index or other page links to it (a log entry does not count)   | `orphan`        | pages | warning |
| Uncited: no index or page lists the capture in `sources` or links to it   | `uncited`       | raw   | warning |
| `##` heading in a `log.md` not `## [YYYY-MM-DD] <op> \| <title>`          | `log-heading`   | logs  | warning |

Each finding ends with its check's name in brackets. The orphan and uncited counts leave out what a
switch turns off. Links inside fenced blocks and inline code are examples and are not checked. A
failure names the other path when a file of the same name exists elsewhere in the vault.

## Workflow

1. Run the vault's check (its own command, else the script) and read its report: failures, warnings,
   then the counts.
2. For an implementation task, fix failures introduced by the current change. A warning with a
   clear, in-scope fix can be corrected too. A request to check or review reports findings only.
3. Rerun after fixes and report the actual CLI status. For a scoped change, finish once no failure
   it introduced remains. List pre-existing findings separately. Require an overall `PASS` when the
   task authorizes fixing the whole vault.

| Exit | Meaning                                     |
| ---- | ------------------------------------------- |
| 0    | `PASS`: no failures; warnings may remain    |
| 1    | Bad arguments, or no `WIKI.md` at `--vault` |
| 2    | `FAIL`: at least one failure is left to fix |
