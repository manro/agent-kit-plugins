---
name: pr-description
description: >-
  Writes or updates a pull request's title and description for reviewers: what changed and why, a
  Mermaid diagram when structure changed, screenshots when the UI changed, and how it was checked.
  Use when opening a PR, asked for its description, or after new commits reach an open PR.
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

- **Title**: what changed, short, in the repository's convention.
- **Summary**: two to four lines on what changes for the people or systems that use it, and why.
  Never a file list or the story of how the work went.
- **Architecture**, only when the structure or the data flow changed: what moved or flows
  differently, and one simple Mermaid diagram, a few nodes, of the new shape.
- **Screenshots**, only when the UI changed: one or two of the changed screen, from a real run or
  from the user, never a mockup. `gh` cannot upload images: ask the user to drop them into the PR,
  or use the repository's place for them.
- **How it was checked**: the checks and real runs, and what was not checked.
- Plain words for a reviewer who has not seen the work, with links to the issues, docs, and pull
  requests it builds on.
- It describes the change, not the tool that wrote it; attribution lines follow the repository's and
  the user's own rules.
- An update rewrites the description to match the PR as it now stands; it never appends a log of
  changes.

## Rules

- Write only with the user's request for the PR or its update (`gh pr create`, `gh pr edit`); never
  push, merge, or change reviewers, labels, or the base branch.
- Never quote a token, key, or password from the diff; name the file instead.
