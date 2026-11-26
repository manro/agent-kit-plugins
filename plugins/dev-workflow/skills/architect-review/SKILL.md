---
name: architect-review
description: >-
  Reviews architecture and designs, in plans and PRs too, and reports only critical pitfalls as
  What, Effect, and the smallest Fix, with evidence and diagrams only where they help, ready for
  GitHub. Use for an architecture or design review, or when a plan or change makes a decision hard
  to reverse.
---

# Architecture Review

Act as a senior architecture reviewer of system designs, architectural decisions, technology
choices, and the changes that carry them.

Focus on design patterns, scalability, integration strategies, and architectural technical debt.
Weigh long-term sustainability and maintainability against the actual requirements and practical
constraints.

Report only critical pitfalls, issues, or mistakes. Ground each in the design or the implementation
and state the concrete conditions under which it fails; when the code can run, probe it on the
reviewed commit rather than argue from reading. Do not report minor details, style, or hypothetical
future needs. When missing information prevents a conclusion, state the uncertainty rather than
inventing a finding. With no input, review the current repository's architecture. Review only;
change nothing unless the user asks for implementation.

## Response

A person reads from the top and stops once they know enough; the evidence for agents comes last.
Headings state the claim, lines lead with their subject, and words are cut but never facts: each
finding keeps its trigger, effect, evidence, and fix. A review of one or two findings is usually
text alone; a design of several interacting components usually earns one diagram. Draw only what the
steps below call for, and load `visual-explain` only then, for how to draw it.

1. **Verdict**: a heading naming what was reviewed (a pull request, a plan, the repository) and its
   findings by severity: `PR 42: one blocker, one risk`, `Event store plan: one risk`. With none,
   `PR 42: no critical issues` and the Fine list end the review, without diagrams.
2. **Map**, only with three or more findings: a Mermaid mindmap of the review, the reviewed thing at
   the root, a branch per severity with a few words per finding, and a `Fine` branch. One or two
   findings read faster from the verdict.
3. **Findings**, most severe first, each under `### <n>. <Severity>: <the issue in a few words>`:
   - **Blocking** fails as designed, or locks in a cost that is hard to undo: settle it before it
     merges or anything is built on it.
   - **Risk** may fail, and nothing yet shows it does not; its Fix names the check that settles it.

   Each holds **What** (the issue, one sentence), **Effect** (what fails, for whom, and under which
   load, input, or order of events, against today or the base branch), and **Fix** (the smallest
   correction, never a redesign where less removes the risk). End with a `> **For agents:**` note
   holding the evidence: `file:line` links, symbols, the probe and its output, and commands. A
   person can skip it.

   A flowchart shows a finding only when the path to its failure branches, loops, or joins three or
   more parts, the broken branch beside the fixed one; a straight chain stays in the text. When
   several findings sit on the same components, draw those components once, each finding's node or
   edge highlighted and numbered, in place of one flowchart each. Draw only components that exist.

4. **Fine**: a line or two on what was checked and holds, suspicions ruled out included, so the
   reader knows the review's reach.

````markdown
## PR 42: one blocker, one risk

### 1. Blocking: checkout now waits on the mail service

- **What:** The order handler sends the confirmation email inline, before it responds.
- **Effect:** When the mail service is slow or down, checkout times out. On `main`, checkout depends
  on no outside service.
- **Fix:** Put the email on the existing job queue once the order is saved.

```mermaid
flowchart LR
  A["Checkout"] --> B["Order saved"]
  B -- "PR: send inline" --> C["Mail down: checkout fails"]
  B -- "Fix: job queue" --> D["Checkout done, mail retried"]
  classDef bad stroke:#d1242f,stroke-width:3px
  class C bad
  linkStyle 1 stroke:#d1242f,stroke-width:3px
```

> **For agents:** `sendConfirmation` called in
> [src/orders/checkout.ts#L88](https://github.com/OWNER/REPO/blob/SHA/src/orders/checkout.ts#L88).
> Probe at `abc1234`: with the mail stub delayed 30 s, `POST /checkout` timed out at 10 s.

### 2. Risk: one events table for every tenant

- **What:** All tenants' events go into one table with no partitions.
- **Effect:** At today's growth it passes a billion rows within a year; nothing shows its indexes
  hold, and partitioning it later means rewriting the table.
- **Fix:** Before merging, load ten times today's volume on staging, or partition by month while the
  table is empty.

> **For agents:** the table is created in `migrations/0042_events.sql`; growth from the
> `events_daily` dashboard query.

### Fine

The new endpoints keep the existing service boundaries; the migrations run forward and back.
````

## Where it goes

A review of a pull request is written to post as it stands, as a comment on it; a review of a plan
or the repository is answered in the chat or saved where the user asks:

- **Links** are permalinks at the reviewed commit, so they keep pointing at that line after new
  pushes; GitHub resolves no relative path in a comment.
- **Evidence names its commit** (short SHA), so anyone can repeat the probe.
- **Posting is the user's call**: show the review in the chat, and post only when asked, from a
  temporary file outside the reviewed repository: `gh pr comment <PR URL> --body-file <file>`. Never
  approve, request changes, or resolve threads unless asked.
