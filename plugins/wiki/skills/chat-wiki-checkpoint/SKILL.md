---
name: chat-wiki-checkpoint
description: >-
  Saves a recurring chat's setup as a profile page in the repository's wiki vault: purpose, scope,
  how it works, and what a restored chat loads, never its progress. Creates the vault's chat
  profiles folder and index when missing. Use when asked to checkpoint or save a chat for later.
---

# Chat wiki checkpoint

## When to use

**MUST** apply when the user asks to checkpoint, save, or preserve a chat's setup so a later chat
can restore it, or to create or update a chat profile. Restoring one is the `chat-wiki-resume`
skill's job.

## Scope

- The vault's chat profiles: one profile, their index, and on first use the template and the schema
  section.
- The profiles' log, and the repository home of any rule or unfinished work the chat leaves.

## Repository facts

Read these before writing:

- **The vault**: the folder holding `WIKI.md` that the root agent instructions point at. With none,
  stop and offer the `wiki-config` skill to create one.
- **Where profiles live**: what the vault's `WIKI.md` or the root agent instructions declare for
  chat profiles: the folder, template, index, frontmatter, and sections. A declaration wins over
  this skill wherever they differ; without one, [§ Default layout](#default-layout) applies.
- **The profiles' log**: the log the vault's schema names for chat profiles: the vault's `log.md`,
  unless the schema names a log per area; then none when it gives profiles no log.
- **Where rules and work go**: the homes the root agent instructions name for rules, plans, and
  tasks.

## Default layout

| Path                         | Holds                                            |
| ---------------------------- | ------------------------------------------------ |
| `<vault>/chats/<slug>.md`    | One profile per recurring chat                   |
| `<vault>/chats/index.md`     | Every profile with its status and `updated` date |
| `<vault>/_templates/chat.md` | The profile template                             |

`<slug>` is kebab-case, named for the chat's subject.

## Set up

A checkpoint plans whatever of these is missing, at the declared paths or the defaults, in the same
confirmation as the profile:

1. The index from `assets/index.md`, dated today.
2. The template from `assets/chat.md`.
3. A `- [Chat profiles](chats/index.md): one profile per recurring chat` line in the vault home
   `index.md`, and a `chats/` line in the topic list under `WIKI.md` § Layout.
4. With no declaration, the section in `assets/wiki-section.md`, added to `WIKI.md`: it declares
   where profiles live, so later runs and other readers follow it.
5. The log entry `## [<today>] create | Chat profiles`, when the profiles have a log.

## Profile

A profile is the chat's master prompt: what the chat is for and how it works, so any client can
restore it. It describes the chat, never its progress. Where the work stands lives in plans, tasks,
git, and the deliverable's own source; the profile's `Load` points at them.

| Section       | Holds                                                                            |
| ------------- | -------------------------------------------------------------------------------- |
| `Purpose`     | One paragraph: what the chat is for and whom it serves                           |
| `Scope`       | What the chat owns, and what it leaves to another chat or skill                  |
| `How to work` | Principles and user decisions for this chat; links to the rules it follows       |
| `Load`        | What a restored chat reads first, in order, including where live work is tracked |
| `Pins`        | Stable facts no repository file holds: locations, names; or `- none`             |

| Field            | Holds                                                     |
| ---------------- | --------------------------------------------------------- |
| `title`          | A short name for the chat, also its `#` heading           |
| `chat`           | The chat title, per the `chat-title` skill when installed |
| `status`         | `active`, `paused`, or `done`                             |
| `created`        | `YYYY-MM-DD`; `updated` moves with every content change   |
| `skills`         | The skills a restored chat loads                          |
| `tier`, `effort` | Optional; only the `chat-model-suggest` skill sets them   |
| `sources`        | The repository files its `How to work` rules come from    |

Every line passes this test before it goes in:

1. Would a restored chat behave wrongly without it? If not, cut it.
2. Does a repository file already say it? Link that file instead.
3. Does it hold beyond this chat? It goes to its own home ([§ Workflow](#workflow) step 4), and the
   profile links it.
4. Is it generic? A `How to work` rule names the kind of thing it governs, never the one instance it
   came up for. A file a restored chat must open goes to `Load`; a stable name or place to `Pins`.

The body holds no value that goes stale between checkpoints: commit hashes, chat or session ids,
dates, counts, timings, versions in flight, ticket or PR numbers, line numbers, run results. It
names the file that holds them instead. A profile has no `State`, `Next`, or `Sessions` section;
past 100 lines it holds detail that belongs in the files it links.

## Workflow

1. Find the vault and where its profiles live ([§ Repository facts](#repository-facts)).
2. Find the profile: the one this chat was restored from, the slug the user gives, or a new slug for
   the chat's subject, started from the template.
3. Derive from the chat its purpose, what it owns and leaves, the principles and user decisions it
   works by, what a restored chat must read first, and the stable facts it depends on.
4. Route before writing:
   - A rule that holds beyond this chat goes to the most specific home the repository keeps for
     rules of its scope, as the `session-lessons` skill places one when installed; the profile links
     it.
   - Unfinished work goes to the repository's plans or tasks; with no such home, list it to the
     user. It never goes into the profile.
5. Rewrite each section whole, never append. When the result equals the current profile, say it is
   current and stop. Otherwise set `updated` to today; change `status` only when the user says the
   chat paused, finished, or restarted; keep `tier` and `effort`.
6. Add or update the profile's index row: `| [<title>](chats/<slug>.md) | <status> | <updated> |`.
7. Show the profile diff, the set-up files, and every other file to change, and ask once.
8. Write, append `## [<today>] create | <title> chat profile` for a new profile or `update` for a
   changed one to the profiles' log when they have one, and run the `wiki-lint` skill, fixing its
   failures. A file outside the vault gets the repository's own checks.

## Rules

- Idempotent: checkpointing an unchanged chat writes nothing.
- A line that restates a repository file is a defect: link the file instead.
- Never write a secret, token, or exploitable detail; name the file that holds it.
- Never commit; the user decides.
