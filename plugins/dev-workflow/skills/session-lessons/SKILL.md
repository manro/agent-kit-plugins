---
name: session-lessons
description: >-
  Finds a session's generic decisions (corrections, agreed designs, settled conventions, costly
  pitfalls) and proposes each as a short rule where the repository keeps such rules. Use when asked
  what to keep from a session, what the standards missed, or to absorb its lessons.
---

# Session Lessons

A session's corrections are the repository's unwritten rules. This skill writes them down once, in
the right place, so no one has to correct the same thing again.

## Repository facts

- **Where it keeps rules**: its `AGENTS.md`, the docs it links, its skills, a lessons or pitfalls
  file, each read as written. When none fits a rule's scope, ask the user where it goes.

## Workflow

1. **Collect** from the session: each correction the user made (a rename, a moved layer, "always…",
   "never…"), each design they agreed to, each convention settled, and each pitfall that cost a
   retry. The conversation is the source; the diff confirms what landed.
2. **Keep what is verified and generic**: a rule that the code, a run, or live configuration shows,
   not one inferred; that a later change elsewhere in the repository would follow; and that is safe
   to share, with no credentials, private data, or sensitive output. Drop one-off facts, what the
   code or the Git history already records, what the repository already states, and what an agent
   does by default: general advice on planning, checking, or communicating adds nothing. A rule
   earns its place by a decision the user made or a failure the agent did not avoid on its own.
   Search the repository's rules for the topic before proposing one.
3. **Place each** in the most specific existing home that covers its scope: a skill or reference for
   its area, a section of `AGENTS.md`, a pitfalls file. A rule for one app or platform stays in that
   app's or platform's place, and a generic rule carries none of its names. A new section or file
   only when nothing fits.
4. **Write each as one short rule**: the rule, its reason in a clause, and an example from the code
   when one makes it concrete. No story of the session. A date only when the rule depends on a
   version, or on a fact that changes over time: that fact carries the date it was checked, unless
   its home bans dates.
5. **Show the list** (each rule, its home, whether it is new or changes one) and write after the
   user agrees, then show the diff.

## Rules

- A rule that contradicts an existing one is put to the user as a choice, never written over it. The
  rule chosen replaces the other; never keep both.
- Where a rule or doc disagrees with the code or live configuration, the code or configuration is
  the fact: propose replacing the stale statement, not adding a second one beside it.
- Never commit; the user decides.
- Keep out of each rule what the repository's own rules keep out of its files.
