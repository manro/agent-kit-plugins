---
name: claude-skill-links
description: >-
  Links each skill folder under `.agents/skills/` into `.claude/skills/` so Claude Code finds the
  skills Codex and Cursor read natively. Runs at Claude Code startup in repositories that hold both
  folders. Use after adding, renaming, or removing a skill, or when Claude Code misses one.
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

The plugin's `SessionStart` hook runs the script at every Claude Code startup. It acts only when the
project holds both `.agents/skills/` and `.claude/skills/`; a repository opts in by creating
`.claude/skills/` (commit a `.gitkeep` and gitignore the links). The hook prints nothing on success,
and it is off for Codex, which reads `.agents/skills/` itself.

Run it by hand after changing skills mid-session, from the repository root, with Node 22 or later:

```bash
node <this skill's folder>/scripts/dist/claude-skill-links.run.mjs
```

| Flag           | Default          | Meaning                                         |
| -------------- | ---------------- | ----------------------------------------------- |
| `--root`       | `.`              | Repository root                                 |
| `--skills-dir` | `.agents/skills` | Skills folder, relative to the root             |
| `--links-dir`  | `.claude/skills` | Links folder, relative to the root; created     |
| `--if-present` | off              | Do nothing unless both folders exist (the hook) |
| `--log-level`  | `info`           | `warn` hides the list of changes                |

Claude Code watches `.claude/skills/` live; when the folder itself was created after launch, run
`/reload-skills`.

## What it does

- A folder holding `SKILL.md` is a skill; any other folder is a group to walk into, such as
  `[commands]/`. Each skill gets a link named after its folder, with a relative target.
- Creates missing links, repoints links to another target, and removes links whose target holds no
  `SKILL.md`. A link to a skill outside the skills folder stays.
- A real folder named like a skill shadows it: logged as a warning and left as is.
- Two skills with the same folder name fail the run before any change: Claude Code flattens skills
  by folder name and can load only one.

| Exit | Meaning                                                          |
| ---- | ---------------------------------------------------------------- |
| 0    | Links match the skills, or `--if-present` found a folder missing |
| 1    | Bad arguments, no skills folder, or a duplicate skill name       |

## Scripts

`scripts/` is a package, `@manro/agent-kit-skill-claude-skill-links`, laid out like an app
(`code-architecture` § Package anatomy) and run by plain Node. Paths below are under `src/`.

| Path                           | Holds                                                     |
| ------------------------------ | --------------------------------------------------------- |
| `claude-skill-links.run.ts`    | The entry: runs `SyncCommand`                             |
| `cli/commands/sync.command.ts` | Parses the flags, finds the skills, applies the link plan |
| `core/link/link-planner.ts`    | The create, repoint, and remove actions; shadowed names   |
| `base/fs-links-dir.adapter.ts` | The links folder on disk                                  |

Skill discovery and duplicate names come from `@manro/lib-agent-skills`.
