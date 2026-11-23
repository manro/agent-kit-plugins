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

- **The skill router**, if any: the file that lists every skill, named in `AGENTS.md`.
- **Always-loaded docs** beyond `AGENTS.md` and `CLAUDE.md`: what `AGENTS.md` says every task loads.
- **The Markdown line limit**: what `AGENTS.md` states, else `.editorconfig` `max_line_length` for
  `[*]` or `[*.md]`; none means no `--line-limit`.
- **Conventions it does not hold**: a repository whose skills may carry dates, or with no line
  limit, switches that check off.

## Run

From the repository root, with Node 22 or later:

```bash
node <this skill's folder>/scripts/dist/agents-infra-audit.run.mjs --plain --router .agents/SKILL-ROUTER.md
```

| Flag                 | Default          | Meaning                                               |
| -------------------- | ---------------- | ----------------------------------------------------- |
| `--root`             | `.`              | Repository root                                       |
| `--agents-dir`       | `.agents`        | Agent docs, with skills in its `skills/`              |
| `--links-dir`        | `.claude/skills` | Claude Code skill links                               |
| `--router`           | none             | Skill router; without it the router check is skipped  |
| `--always-loaded`    | none             | One more always-loaded doc for the budget; repeatable |
| `--line-limit`       | none             | Markdown line limit; without it no line is too long   |
| `--mcp-template`     | the usual three  | A template to compare; repeatable                     |
| `--no-skill-history` | off              | Allow dates, ADR records, and months in skills        |
| `--no-mcp-templates` | off              | Skip the template comparison                          |

The usual MCP templates are `.mcp.json.example`, `.cursor/mcp.json.example`, and
`.codex/config.toml.example`; the comparison runs when two or more exist.

## What it checks

Every check is a failure unless the table says otherwise. The audited Markdown is `AGENTS.md`,
`CLAUDE.md`, and every `.md` file under the agents folder.

| Check                                                                                      | Off with             |
| ------------------------------------------------------------------------------------------ | -------------------- |
| A backticked `.agents/…`, `AGENTS.md`, or `CLAUDE.md` path exists; `<x>`, `*`, `{}` skip   | —                    |
| A Markdown link resolves: `/` from the root, else from the file; URLs and anchors skip     | —                    |
| `SKILL.md` frontmatter: `name` equals the folder, lowercase-hyphen, at most 64 chars       | —                    |
| `SKILL.md` frontmatter: a `description` of at most 1024 chars                              | —                    |
| Skill folder names are unique                                                              | —                    |
| The router lists each skill by name or namespaced path in backticks, or a local skill link | no `--router`        |
| Each link in the links folder resolves to the skill of its name; no real folder shadows    | —                    |
| A skill with no link in an existing links folder (warning)                                 | —                    |
| A house `SKILL.md` names no date, ADR record, or month and year; vendored skills skip      | `--no-skill-history` |
| No Markdown line runs past the limit where it could wrap                                   | no `--line-limit`    |
| Every MCP template declares the same servers                                               | `--no-mcp-templates` |

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

| Exit | Meaning                                       |
| ---- | --------------------------------------------- |
| 0    | `PASS`: no failures; warnings may remain      |
| 1    | Bad arguments, no agents folder, or no router |
| 2    | `FAIL`: at least one failure is left to fix   |

## Scripts

`scripts/` is a package, `@manro/agent-kit-skill-agents-infra-audit`, laid out like an app
(`code-architecture` § Package anatomy) and run by plain Node. Paths below are under `src/`.

| Path                              | Holds                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `agents-infra-audit.run.ts`       | The entry: runs `AuditCommand`                         |
| `cli/commands/audit.command.ts`   | Parses the flags, picks the present MCP templates      |
| `cli/audit-report-formatter.ts`   | The report as lines                                    |
| `base/fs-repo-reader.adapter.ts`  | Files, folders, and resolved links on disk             |
| `base/git-head-reader.adapter.ts` | Changed files and their text at `HEAD`                 |
| `core/check/`                     | References, skills, links, line limit, MCP templates   |
| `core/budget/token-budget.ts`     | Word and token counts                                  |
| `core/composer/infra-auditor.ts`  | `InfraAuditor`: runs every check and builds the report |

Markdown scanning and frontmatter come from `@manro/lib-markdown`; skill discovery and duplicate
names from `@manro/lib-agent-skills`.
