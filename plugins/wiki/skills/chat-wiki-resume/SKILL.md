---
name: chat-wiki-resume
description: >-
  Restores a recurring chat from its profile in the repository's wiki vault: names the chat, loads
  the profile, its skills, and what it says to read first, reads the live work state those point at,
  and briefs the user before any work. Read-only. Use when asked to resume or list saved chats.
---

# Chat wiki resume

## When to use

**MUST** apply when the user asks to resume, restore, or reload a saved chat, names a chat profile
at the start of a chat, or asks which chat profiles exist. Saving one is the `chat-wiki-checkpoint`
skill's job.

## Scope

- Reads the vault's chat profiles and the files a profile's `Load` names. Writes nothing; renames
  the chat where the client allows.

## Repository facts

- **The vault and where its profiles live**: found as `chat-wiki-checkpoint` § Repository facts
  finds them. With no profiles yet, say so and offer `chat-wiki-checkpoint`.

## Inputs

- A profile's slug, or words that match one profile's title.
- `list`: every profile in the index, with its slug, title, status, and `updated` date.

## Workflow

1. **Find the profile** by slug, else by title in the index. With no match or several, print the
   list and ask which. For `list`, print it and stop.
2. **Name the chat** with the profile's `chat` value, applied as `chat-title` § Applying says when
   that skill is installed; otherwise print it on one line to paste.
3. **Load** the profile, then each skill in its `skills`, then its `Load` list in order. Live state
   (open plans, tasks, the deliverable's source) comes from what `Load` names, read now, never from
   the profile.
4. **Brief** in at most six lines: purpose, scope, the `How to work` points that shape the next
   step, and the open work found through `Load`. When the profile sets `tier` and `effort` and the
   session runs on another model or effort, name the switch, mapped by `chat-model-suggest` § Tiers
   when installed, else the tier and effort as written; the user makes it. Then ask what to do, and
   change no file until the user answers.

## Rules

- Idempotent: the same profile sets a chat up the same way every time.
- The profile is not the truth about live state. When it disagrees with a file it points at, the
  file wins; say so in the brief, and the next checkpoint fixes the profile.
- A `Load` entry that no longer exists is named in the brief, never guessed at.
- A `paused` profile restores after saying it was paused. A `done` profile restores read-only until
  the user reopens the chat.
