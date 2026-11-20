---
name: commit-message
description: >-
  Writes a 5-7 word one-line commit message from the staged diff, or the working tree when nothing
  is staged, in the style of the recent git log; never stages or commits. Use when proposing a
  commit message or when the user asks what to call a commit.
---

# Commit Message

Work in the target repository. This skill only reads files and Git history.

## Inputs

- No args → the staged changes; when nothing is staged, every changed and untracked file.
- `<path|glob> …` → only those paths, under the same staged-first rule.

## Workflow

1. Collect, read-only. Use `--cached` in the diff commands when `git diff --cached --quiet` exits 1
   (something is staged):

   ```bash
   git status --porcelain -- <paths>
   git diff [--cached] --stat -- <paths>
   git diff [--cached] -- <paths>
   git log --oneline -15
   ```

   Distinguish Git errors from an empty diff. Untracked files show only in `status`: go by their
   names, and read a file when its name says too little. Lockfiles and generated output count as a
   change but are not read. Skip ignored files and credentials.

2. Find the one change the files share. When unrelated changes are mixed, name the largest.
3. Write the line:
   - 5-7 words; an `area:` prefix counts as one.
   - Match the recent log's language and convention: `area: summary` when the log uses that area,
     otherwise an imperative in sentence case (`Move package code under src`). With no commits yet,
     use the imperative. Follow another format when the user asks for one.
   - Name what changed, not how much: `Add commit message command`, never `Update 4 files`.
   - No trailing period, no emoji, no ticket key unless the branch name or the diff carries one.
4. Give the line in a fenced `text` block. Below it, at most one sentence, only when the changes are
   mixed: which files the line leaves out. Proposing several lines for several repositories or
   changes, give one block each, labelled.

No changes in scope → `nothing to commit`.

## Rules

- Never `git add`, `commit`, `stash`, `reset`, or push. The user commits.
- Never quote diff content in the answer. A changed line that holds a token, key, or password is
  named by file, not shown.
