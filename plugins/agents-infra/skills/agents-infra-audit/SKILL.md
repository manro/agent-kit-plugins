---
name: agents-infra-audit
description: >-
  Audits a repository's agent infrastructure: paths and links in AGENTS.md, CLAUDE.md, and
  `.agents/`, skill frontmatter and unique names, the skill router, Claude skill links, MCP template
  parity, history in skills, line length, and token budget. Use after changing any of them.
---

# Agents infra audit

## When to use

**MUST** apply after any add, move, rename, or content update to `AGENTS.md`, `CLAUDE.md`, a file
under `.agents/` (a skill, a doc, the skill router), `.claude/skills/`, or an MCP template, and when
the user asks to audit or check the agent setup.

## Scope

- `AGENTS.md`, `CLAUDE.md`, `.agents/**`, `.claude/skills/`, and the MCP templates, read only. The
  script reports; the agent fixes.

## Repository facts

Read these from the repository before running; each is a flag.

- **The skill router**, if any: the file that lists every skill, under whatever name `AGENTS.md`
  gives it (`.agents/SKILL-ROUTER.md`, `.agents/SKILL-REGISTRY.md`). None means no `--router`.
- **Always-loaded docs** beyond `AGENTS.md` and `CLAUDE.md`: what `AGENTS.md` says every task loads.
- **The Markdown line limit**: what `AGENTS.md` states, else `.editorconfig` `max_line_length` for
  `[*]` or `[*.md]`; none means no `--line-limit`.
- **Conventions it does not hold**: a check the repository's rules do not keep, such as no dates in
  skills, is off; one that holds for only some paths is off for the others. A repository whose own
  command runs this script keeps the switches in that command. One with checks of its own runs them
  after this script, which keeps the shared ones.

## Run

From the repository root, with Node 22 or later:

```bash
node <this skill's folder>/scripts/dist/agents-infra-audit.run.mjs --plain [--router <router file>]
```

| Flag              | Default          | Meaning                                               |
| ----------------- | ---------------- | ----------------------------------------------------- |
| `--root`          | `.`              | Repository root                                       |
| `--agents-dir`    | `.agents`        | Agent docs, with skills in its `skills/`              |
| `--links-dir`     | `.claude/skills` | Claude Code skill links                               |
| `--router`        | none             | Skill router file; without it the router check skips  |
| `--always-loaded` | none             | One more always-loaded doc for the budget; repeatable |
| `--line-limit`    | none             | Markdown line limit; without it no line is too long   |
| `--mcp-template`  | the usual three  | A template to compare; repeatable                     |
| `--off`           | none             | A check to turn off, by name; repeatable              |

`--off <name>` turns a check off, and `--off <name>=<glob>` only for the repo paths the glob matches
and the files under them: `*` stays within one folder, a `**` segment spans any; quote a glob so the
shell leaves it alone. A name the table does not list is a usage error.

The usual MCP templates are `.mcp.json.example`, `.cursor/mcp.json.example`, and
`.codex/config.toml.example`; the comparison runs when two or more exist.

## What it checks

Every check is a failure unless the table says otherwise, and each finding ends with its name in
brackets. The audited Markdown is `AGENTS.md`, `CLAUDE.md`, and every `.md` file under the agents
folder.

| Check                                                                                      | Name                | Also off with     |
| ------------------------------------------------------------------------------------------ | ------------------- | ----------------- |
| A backticked `.agents/…`, `AGENTS.md`, or `CLAUDE.md` path exists; `<x>`, `*`, `{}` skip   | `path-ref`          | —                 |
| A Markdown link resolves: `/` from the root, else from the file; URLs and anchors skip     | `link`              | —                 |
| `SKILL.md` frontmatter: `name` equals the folder, lowercase-hyphen, at most 64 chars       | `skill-name`        | —                 |
| `SKILL.md` frontmatter: a `description` of at most 1024 chars                              | `skill-description` | —                 |
| Skill folder names are unique                                                              | `skill-unique`      | —                 |
| The router lists each skill by name or namespaced path in backticks, or a local skill link | `router`            | no `--router`     |
| Each link in the links folder resolves to the skill of its name; no real folder shadows    | `skill-link`        | —                 |
| A link named like no skill holds a skill folder outside the skills folder (it stays)       | `skill-link`        | —                 |
| A skill with no link in an existing links folder (warning)                                 | `skill-unlinked`    | —                 |
| A house `SKILL.md` names no date, ADR record, or month and year; vendored skills skip      | `skill-history`     | —                 |
| No Markdown line runs past the limit where it could wrap                                   | `line-width`        | no `--line-limit` |
| Every MCP template declares the same servers                                               | `mcp-templates`     | —                 |

Fenced code and inline code hold examples, not links; frontmatter holds no links. A skill is
vendored when its frontmatter has `license:` or its body a `## License` section.

The report then prints the token budget (always-loaded docs, `SKILL.md` files, `references/` files,
all audited files) and, inside a git checkout, the token impact of each changed file against `HEAD`.
Tokens are words times 4/3.

## Workflow

1. Run the script and read its report: failures, warnings, budget, impact, status.
2. For an implementation task, fix failures introduced by the current change. If link repair is in
   scope, use `claude-skill-links`. A request to audit or review reports findings only.
3. Rerun after fixes and report the actual CLI status. For a scoped change, finish once no failure
   it introduced remains. List pre-existing findings separately. Require an overall `PASS` when the
   task authorizes fixing all findings. Mention a large increase in always-loaded tokens.

| Exit | Meaning                                                   |
| ---- | --------------------------------------------------------- |
| 0    | `PASS`: no failures; warnings may remain                  |
| 1    | Bad arguments, no agents folder, or no file at `--router` |
| 2    | `FAIL`: at least one failure is left to fix               |
