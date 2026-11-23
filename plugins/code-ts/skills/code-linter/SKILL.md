---
name: code-linter
description: >-
  Checks changed TypeScript and JavaScript with the project's lint command, and applies scoped
  auto-fixes when supported. Use after editing JS or TS and before committing those changes.
---

# Code Linter

## When to use

Use after creating or modifying JS or TS files, and run the project's lint check on the full change
before committing. Follow any stricter per-edit rule stated by the project.

## Scope

- JS and TS files the repository's lint configuration covers.

## Edit hook

A repository can wire an edit hook that runs its file-scoped lint command after each file write:
Claude Code as `PostToolUse` (matcher `Edit|Write|MultiEdit`), Cursor as `afterFileEdit`. The hook
script belongs to the repository, since it knows which paths the lint covers; it should fail open.
Under Claude Code, errors auto-fix cannot clear come back to the model on exit 2; Cursor only logs
them. A client without an edit hook runs the applicable project command itself.

The hook covers one file per edit. Before finishing, still lint every changed file: an edit can
break a file it did not touch, such as an importer of a renamed export.

## Commands

1. Find the repository's lint command in its instructions, CI, or the owning package's scripts. Run
   it from its documented directory with the project's package manager or task runner.
2. Use a documented file-scoped command if available, for example `npm run lint:file -- <file>` in a
   project that defines it. Pass the files you changed directly, including new files.
3. If the project has only a package-wide command, run that check and fix findings from the current
   change. Use auto-fix only with a supported command scoped to the intended files.
4. If lint is not configured, report that fact. Adding or changing lint configuration is a separate
   task.

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

- If a module or config is missing, check the package directory and the project's setup
  instructions. Report a sandbox restriction if it prevents the configured check from running.
