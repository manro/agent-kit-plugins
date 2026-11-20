---
name: code-annotation
description: >-
  Comment discipline for every code edit: no comments by default, one line when a comment names the
  bug its absence invites; no narration or meta-comments. Use when writing, modifying, or reviewing
  code, and when trimming a branch's comments.
---

# Code Annotation

## When to use

**MUST** apply when writing or modifying code — every comment added, rewritten, or deleted goes
through the keep test and the one-line budget below. Also governs branch-wide comment trims and
delegating a trim to subagents.

## Scope

- Any source file — the discipline is language-agnostic.
- Code comments only; markdown docs, ADRs, lessons, and skill prose are out of scope.

## Core rules

1. **Self-documenting first.** Descriptive names over explanatory comments; let the code speak.
2. **No narration.** Never comment what the code obviously does (`// increment counter`,
   `// return result`).
3. **No meta-comments.** Never write comments addressed to the reviewer or describing the change
   itself (`// changed from X`, `// this fixes the bug`, `// new implementation`). Comments live
   with the code, not the diff.
4. **Allowed, one line each:** non-obvious rationale — architectural decisions, algorithmic
   trade-offs, constraints the code can't express, the link to the upstream bug, the reason a
   workaround exists, compliance requirements. Anything the code itself cannot convey.
5. **Match the file.** Follow the surrounding code's comment density and idiom; keep existing
   public-API docstrings/JSDoc intact unless the signature changed.
6. **TODOs include an owner and a ticket**: `// TODO(jdoe): PROJ-123 — handle empty buckets`. Never
   an orphan TODO.
7. **Mark embedded code with its language.** A string literal whose whole text is code in a language
   the IDE can check (a bundler banner, a preload script, an emitted import, a source fixture) takes
   `// language=<id>` on the line above it (`javascript`, `typescript`, `json`, `sql`, `html`), so
   the IDE highlights and checks it as that language. It is a tool directive, outside the comment
   budget below, and stays bare: the rationale, if any, is its own line above. A fixture built from
   an array of lines stays unmarked, since the IDE injects one literal at a time.
8. **Comments are not source of truth.** If behavior changes and a comment stops matching runtime
   behavior, delete or rewrite it in the same edit — a stale comment is worse than none.

## Budget: zero by default, one line when earned

The default comment budget is **zero**. A comment buys its way in ONLY by passing _the keep test_
below; one that does gets **one line**. There is no middle tier where a mediocre comment survives
because it is short, and no upper tier where a true one earns a paragraph.

If it needs a paragraph, the paragraph is not a comment — it belongs in the module's docs, an ADR,
or a skill, and the code keeps the one-line consequence with a pointer only if the target is stable.

Multi-line blocks are for file / class / exported-API headers only, and are capped by _Calibrate to
the neighbours_ below.

Rationale that explains a **repo-wide pattern** ("why services here, effects there") belongs in the
shared docs, once. Repeating it at every call site guarantees drift: the docs get corrected and the
comments quietly become lies.

## The keep test

Keep a comment only if you can **name the bug its absence invites**. Then write that bug into the
comment, in the one line the budget above allows.

If the honest answer is "someone might find this interesting" or "this explains my design," delete
it. Interesting is not the bar; a named, plausible regression is.

Shape it as _constraint — consequence_, so the next reader learns the cost of ignoring it:

```
// Register before emitting, or a fast response arrives unclaimed.
// FAILED is terminal and a null status is not pending on its own — legacy rows would poll forever.
// Local on purpose: putting the keystroke in global state re-runs every mounted subscriber.
```

Delete anything that restates the code or the name:

```
/** Every distinct label across the given items, sorted. */   // the name already says this
// Warn only when aspect ratios differ                        // the next line says this
// Fresh list whenever this tab opens                         // the dispatch says this
```

## Numbered steps

A function body that runs **three or more ordered steps** — each depending on the one before —
numbers them, one line per step, stating what the step guarantees once it is done:

```
// 1. Every resolved key must be gone from the open-tickets result.
// 2. Transition only keys that passed step 1, so a failed search posts nothing.
// 3. Re-read each ticket: the status the API returned is the one reported.
```

The bug these name is a reordered or merged step that breaks the guarantee a later step relies on.
State the guarantee, not the action — `// 2. Call transition` fails the keep test. Two steps, or
steps that could run in any order, get no numbers. Never number across functions; a sequence that
spans them belongs in the caller.

## Calibrate to the neighbours

Before adding or cutting a header block, measure the peers rather than guessing:

```bash
rg -c '^\s*\*' <sibling-dir>/*.<ext> | sort -t: -k2 -rn   # docblock body lines per file
```

Land at or below the leanest sibling. A file whose header is three times its neighbours' reads as
noise no matter how true it is.

## Local convention outruns this skill

A comment that looks like clutter may be an established idiom. **Grep before deleting**; if the
pattern repeats across sibling files, keep it and match it:

```bash
rg -n '<the exact comment or marker>' <sibling-dir> | head
```

Repeating markers (section dividers, sentinel tags, a stock header shape shared by parallel modules)
are structure, not prose. Deleting them in one file only creates asymmetry a reviewer has to
reconcile.

## Don't churn what you didn't write

Trim comments **you added**. Pre-existing comments that merely moved during an extraction or rename
are out of scope — cutting them inflates the diff and buries the real change. Separate the two
mechanically:

```bash
git diff --find-renames --diff-filter=R --name-status <base>   # pure renames: skip entirely
git show <base>:<old/path> | rg -n '<the comment text>'        # was it already there? then leave it
```

## Trimming a branch

1. Count what you added, per file:
   `git diff --find-renames <base> -- <paths> | rg '^\+' | rg -c '^\+\s*(//|/\*|\*)'`
2. Drop renames, verbatim moves, and `language=` directives from the list (above).
3. Triage the rest: narration → delete; multi-paragraph rationale → one line, or relocate to docs;
   keep only what passes _the keep test_.
4. Grep siblings for conventions before deleting anything that repeats.
5. Prove it changed nothing else, then typecheck and lint:

```bash
git diff HEAD -- <paths> | rg '^[+-]' | rg -v '^(\+\+\+|---)' | rg -v '^[+-]\s*(//|/\*|\*)' | rg -v '^[+-]\s*$'
```

Empty output means comment-only. **Spell the paths out literally.** zsh does not word-split an
unquoted `$FILES`, so routing the list through a variable makes `git diff` match nothing and the
check passes vacuously — it reports success precisely when it inspected nothing. Use `${=FILES}` if
you must use a variable, and sanity-check that the unfiltered `git diff --stat` lists the files you
expect.

Report the before/after count, and flag any judgment call where you kept something to preserve
sibling parity.

## Delegating this to other agents

Trimming parallelises well across files, but two failure modes recur and are worth pre-empting in
the instructions you give:

- **Scope drift into inherited comments.** State the baseline commit explicitly ("comments added by
  <PR/branch>, not by earlier work"). Agents otherwise apply the rubric to whatever looks verbose,
  and a rubric-correct deletion of a pre-existing comment is still out of scope. Re-verify
  centrally: diff every removed line against the set of comments in the baseline tree and restore
  any hit.
- **Rewrites that smuggle in new claims.** Reshaping a comment into _constraint — consequence_ is
  fine only when the consequence was already stated or is provably true. Check each rewritten line
  against the original text and the code before accepting it.

Trust the counts an agent reports only after re-running the comment-only proof yourself.
