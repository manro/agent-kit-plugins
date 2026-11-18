---
name: code-linter
description: >-
  Runs ESLint auto-fix on TypeScript/JavaScript files through the project's lint script, and the
  edit hook a repository can wire to do it after every agent edit. Use after every .ts/.tsx/.js/.jsx
  file creation or modification, and before committing changes.
---

# Code Linter

## When to use

**MUST** run after every `.ts`, `.tsx`, `.js`, or `.jsx` file creation or modification, and before
committing.

## Scope

- `**/*.{ts,tsx,js,jsx}`

## Edit hook

A repository can wire an edit hook that runs its `lint:file` script after each file write: Claude
Code as `PostToolUse` (matcher `Edit|Write|MultiEdit`), Cursor as `afterFileEdit`. The hook script
belongs to the repository, since it knows which paths the lint covers; it should fail open. Under
Claude Code, errors auto-fix cannot clear come back to the model on exit 2; Cursor only logs them. A
client without an edit hook runs the commands below itself.

The hook covers one file per edit. Before finishing, still lint every changed file: an edit can
break a file it did not touch, such as an importer of a renamed export.

## Commands

Run the project's package script, never a global `eslint`: the script pins the config mode and the
plugin versions.

```bash
pnpm -s lint:file <file> [<file> ...]
```

All changed files:

```bash
git diff --name-only --diff-filter=ACMR | rg -N '\.(ts|tsx|js|jsx)$' | xargs pnpm -s lint:file
```

## What auto-fix covers

| Plugin                             | Fixes                                                |
| ---------------------------------- | ---------------------------------------------------- |
| `simple-import-sort/imports`       | Import ordering                                      |
| `unused-imports/no-unused-imports` | Remove unused imports                                |
| `consistent-type-imports`          | Mark type-only imports `type`                        |
| Prettier                           | Formatting (indentation, semicolons, commas, quotes) |

**Not auto-fixable:** type errors, `no-restricted-syntax` and `no-restricted-imports` findings — fix
by hand.

## Exceptions

- Side-effect imports may need `/* eslint-disable unused-imports/no-unused-imports */`.

## Troubleshooting

- **"Cannot find module" or "Operation not permitted"** — the agent sandbox blocks the package
  manager; rerun the command outside the sandbox.
- **"Configuration not found"** — run from the project root.
