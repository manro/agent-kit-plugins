---
name: pr-description
description: >-
  Writes or updates a pull request's title and description for reviewers: what changed and why, how
  it was checked, screenshots of UI changes, and a diagram or For agents notes only when a change
  needs them. Use when opening a PR, asked for its description, or after new commits reach an open
  PR.
---

# PR Description

Work in the target repository. This skill reads Git and the pull request, and writes only the PR's
title and body.

## Repository facts

- **Its PR template** (`.github/pull_request_template.md` or the like), read as written: its
  sections come first, and this skill fills them.
- **Its title convention**, from its recent merged pull requests.

## Before writing

1. Check where the work is: `git branch --show-current` and `git status`. The user may have switched
   branches or merged since the last step.
2. For an existing PR, check its state: `gh pr view --json state,headRefName,url`. A merged or
   closed PR is not updated: its follow-up needs a new branch and a new PR. Say so and stop.
3. Read what the PR holds: `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`, and
   the diff where the stat says too little.

## The description

A reviewer reads from the top and stops once they know enough; what only an agent needs comes last.
Lines lead with their subject, and words are cut but never facts. A small PR, one area with no
change in how parts connect, is a title, a summary, and how it was checked, with a screenshot if the
UI changed: no diagram and no need for `visual-explain`, and a For agents part only when the diff
does not show where to start. Load that skill only to draw.

- **Title**: what changed, short, in the repository's convention.
- **Summary**: two to four lines on what changes for the people or systems that use it, and why.
  Never a file list or the story of how the work went.
- **Architecture**, only when the structure or the data flow changed: what moved or flows
  differently. One simple Mermaid diagram of the new shape, only when the change joins three or more
  parts with a branch, a loop, or several actors (`visual-explain` § When to draw). It draws the
  changed part with the code's names; parts that did not change need no drawing.
- **Screenshots**, only when the UI changed: one or two of the changed screen, from a real run or
  from the user, never a mockup. `gh` cannot upload images: ask the user to drop them into the PR,
  or use the repository's place for them.
- **How it was checked**: the checks and real runs; what a review found and which findings this PR
  fixes, a line each; and what was not checked.
- **For agents**, last and at most five lines, when the diff alone does not show where to start: the
  entry points, the commands that check the change, and the constraints the diff does not show
  (generated files, ordering, flags). A person can skip it.
- Plain words for a reviewer who has not seen the work, with links to the issues, docs, and pull
  requests it builds on.
- **On GitHub**: a file is a permalink at the head commit or a name in backticks, since GitHub
  resolves no relative path in a PR body. No local paths, scratch files, or session links.
- It describes the change, not the tool that wrote it; attribution lines follow the repository's and
  the user's own rules.
- An update rewrites the description to match the PR as it now stands; it never appends a log of
  changes.

## Rules

- Write only with the user's request for the PR or its update (`gh pr create`, `gh pr edit`); never
  push, merge, or change reviewers, labels, or the base branch.
- Never quote a token, key, or password from the diff; name the file instead.
