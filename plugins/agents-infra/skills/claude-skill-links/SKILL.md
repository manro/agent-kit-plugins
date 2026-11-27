---
name: claude-skill-links
description: >-
  Links skills from `.agents/skills/` into `.claude/skills/`, except where git keeps a skill but
  would show its link in `git status`. Runs at Claude Code startup when `.agents/skills/` and
  `.claude/` exist. Use after adding, renaming, or removing a skill, or when Claude Code misses one.
---

# Claude skill links

## When to use

**MUST** apply after adding, renaming, moving, or removing a skill under `.agents/skills/` in a
repository whose Claude Code skills come from links in `.claude/skills/`, and when Claude Code does
not list a skill that exists there.

## Scope

- `.agents/skills/**`, read only.
- `.claude/skills/`: symlinks only; real folders there are never touched.

## How it runs

The plugin's `SessionStart` hook runs the script at every Claude Code startup. When both
`.agents/skills/` and `.claude/` exist, it creates `.claude/skills/` as needed and syncs the links,
unless git keeps the skills and would not ignore their links (below). Gitignore the generated links
in projects that use this hook. When links change, the hook asks Claude Code to rescan skills before
the first prompt. Codex reads `.agents/skills/` itself.

Run it by hand after changing skills mid-session, from the repository root, with Node 22 or later:

```bash
node <this skill's folder>/scripts/dist/claude-skill-links.run.mjs
```

| Flag              | Default          | Meaning                                                 |
| ----------------- | ---------------- | ------------------------------------------------------- |
| `--root`          | `.`              | Repository root                                         |
| `--skills-dir`    | `.agents/skills` | Skills folder, relative to the root                     |
| `--links-dir`     | `.claude/skills` | Links folder, relative to the root; created             |
| `--if-present`    | off              | Require the source folder and the links folder's parent |
| `--reload-skills` | off              | Emit a Claude startup rescan request if links change    |
| `--log-level`     | `info`           | `warn` hides the list of changes and the skip reason    |

Claude Code watches `.claude/skills/` live; when the folder itself was created after launch, run
`/reload-skills`.

## A repository's own skills

When git keeps a skill under the skills folder (tracked, or untracked and not ignored) and would not
ignore its link in the links folder, that link would show in `git status`: the repository wires its
own skills, as one that commits its own `.claude/skills/` does. The run then changes nothing: no
links folder, no link created, repointed, or removed. It logs why at info level, so a run by hand
prints the reason and the startup hook stays silent. The check comes before the duplicate-name check
below.

| Skills folder                 | Links folder | Run     |
| ----------------------------- | ------------ | ------- |
| Kept in git                   | Not ignored  | Skipped |
| Kept in git                   | Ignored      | Linked  |
| Ignored                       | Either       | Linked  |
| No git, or outside a checkout | Either       | Linked  |

- To link a repository's committed skills, ignore the links folder, as `/.claude/skills/` in
  `.gitignore`. A committed link counts as not ignored, so a repository that commits its links is
  skipped.
- git answers per skill and per link: `.agents/skills/*` in `.gitignore` counts as ignored, and a
  tracked skill counts as kept even where an ignore rule matches it. When a symlinked folder hides
  the links' paths from git, the run links as before.
- Links an earlier run made stay; delete them by hand if the repository does not want them.

## What it does

- A folder holding `SKILL.md` is a skill; any other folder is a group to walk into, such as
  `[commands]/`. Each skill gets a link named after its folder, with a relative target.
- Creates missing links, repoints links to another target, and removes links whose target holds no
  `SKILL.md`. A link to a skill outside the skills folder stays.
- A real folder named like a skill shadows it: logged as a warning and left as is.
- Two skills with the same folder name fail the run before any change: Claude Code flattens skills
  by folder name and can load only one.

| Exit | Meaning                                                                            |
| ---- | ---------------------------------------------------------------------------------- |
| 0    | Links match the skills, `--if-present` skipped the sync, or the repo wires its own |
| 1    | Bad arguments, no skills folder, a duplicate skill name, or git could not answer   |
