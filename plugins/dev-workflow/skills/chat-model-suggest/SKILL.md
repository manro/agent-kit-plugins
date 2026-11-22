---
name: chat-model-suggest
description: >-
  Estimates the model tier and effort for the rest of a chat's work: scores ambiguity, blast radius,
  breadth, depth, volume, and sensitivity, plans runner, model, and effort per phase, and times the
  switch. Use when asked which model or effort a chat, task, or plan should run on.
---

# Chat model suggestion

## When to use

**MUST** apply when the user asks which model or effort a chat, a task, or a plan should run on, or
whether a chat runs on too strong or too weak a model.

## Scope

Activity-triggered. Reads the chat, the plans and skills it names, and the context usage the client
reports. Writes only the `tier` and `effort` fields of the chat's profile, after the user's yes.

## Inputs

- Nothing: the conversation so far, its goal, what is done, and what is left.
- A goal: work about to start, in a new chat or a new phase of this one.
- A probe, when the user asks for one: one cheap read-only call per outside system to size it, such
  as a ticket search's result count or a repository's file count. Without it, a system is rated by
  its name and what the chat says.

## Tiers

| Tier       | Fits                                                                  | Claude Code |
| ---------- | --------------------------------------------------------------------- | ----------- |
| `fast`     | A literal step list, many simple tool calls, no design                | `haiku`     |
| `balanced` | Specified work with local judgement: a contained fix, a review        | `sonnet`    |
| `strong`   | Open design, hard debugging, writing for people, shared-system writes | `opus`      |

In Codex and Cursor the tiers are the fastest model, the default coding model, and the strongest
reasoning model in the client's own model picker; name that model. Effort: `low` follows a fixed
list; `medium` is routine judgement; `high` is design, drafting, or a subtle change; `xhigh` is a
design fork or a failure two fixes have not cleared; `max` only on the user's ask. A model that
lacks a level takes the nearest one it has. A delegated step takes its runner, model, and effort
from the repository's delegation rules where it has them.

## Workflow

1. **Gather** from the chat: the goal, the phases done and left, the skills loaded, the systems the
   rest touches (MCP servers, repositories, sites) and whether each is read or written, the current
   model and effort, and how full the context is (the client's usage report, else the chat's
   length).
2. **Score** the remaining work low, medium, or high on each dimension:
   - **Ambiguity**: an open question or a fixed spec.
   - **Blast radius**: local files, or writes to a shared system (a tracker, a repository host,
     mail, a browser session).
   - **Breadth**: how many files, repositories, and systems.
   - **Depth**: reasoning chains, debugging, design.
   - **Volume**: how many mechanical tool calls.
   - **Sensitivity**: people, money, security, legal or public text.

   The tier is the highest that depth, ambiguity, or sensitivity calls for; blast radius raises it
   one step when this chat makes the writes itself. Effort follows depth. High volume with low depth
   argues for delegating that phase, not for a lower tier for the whole chat.

3. **Split into phases** where the score changes, and give each a runner: this chat, a sub-agent, or
   another agent's job. Delegate a phase that is self-contained and whose result is quick to check;
   keep one here that needs this chat's context.
4. **Time the switch.** A switch makes the next turn re-read the whole context uncached on the new
   model, so recommend one of:
   - **now**, when the context is small or most of the work is left;
   - **at a phase boundary**, naming the phase;
   - **a fresh chat**, when the context is large and the rest is a different kind of work: through
     the `chat-wiki-checkpoint` and `chat-wiki-resume` skills when installed, else a short hand-off
     the user pastes into the new chat;
   - **stay**, when the gain is smaller than the re-read.
5. **Report** the current model, effort, and context use in one line; a table of phase, runner, tier
   and model, effort, and the reason; the switch line; then ask whether to apply. At most ten lines
   besides the table.
6. **Apply on yes**:
   - **Switch**: a session cannot change its own model by a tool call, so name the exact choice: the
     Claude Code app's model menu, `/model <alias>` in the Claude Code CLI, `/model` in Codex, or
     Cursor's model picker, with the effort to set beside it.
   - **Profile**: when the chat has a profile per `chat-wiki-checkpoint` (it was restored from one,
     or one matches its purpose), set its `tier` and `effort` to this chat's main phase, then finish
     as `chat-wiki-checkpoint` § Workflow does: `updated`, the index row, the log entry, and the
     `wiki-lint` run. With no profile, say so and offer `chat-wiki-checkpoint` when installed.

## Rules

- Estimate from what the chat shows. Query an outside system only for a probe, read-only.
- Recommend a lower tier as readily as a higher one.
- The profile holds one tier and effort for the chat, never the phase plan; a tier, not a model id,
  so any client can restore it.
- The estimate is advice; the user picks the model.
