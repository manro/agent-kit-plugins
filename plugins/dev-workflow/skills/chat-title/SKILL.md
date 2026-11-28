---
name: chat-title
description: >-
  Names and renames chats as `<group icon> [Group] - <chat icon> Topic`. Completes partial titles
  using the group's existing icons and applies the finished title where supported. Use when a chat
  starts or when asked to name, rename, or add icons to chats.
---

# Chat titles

## When to use

**MUST** apply when:

- A chat starts and the client lets the agent rename it (first turn only).
- The agent names a chat, session, or thread it starts for the user.
- The user invokes the skill or asks to name, rename, or add an icon to chats.

## Complete the title before applying it

Calling this skill with `[Group] - Topic` asks you to complete and apply the title in this turn.
Read the group and topic from the input, keep their spelling and case, and fill every missing icon.
Keep icons the user supplies in their given positions. Use raw text only if the user explicitly asks
for a verbatim title or a title without icons.

Resolve icons in this order:

1. Use the user's stated convention, then the repository's rules in `AGENTS.md` and its linked docs.
2. Where those rules are silent, check saved chat profiles (such as their `chat` field) and titles
   in the same `[Group]` that the client can list. Reuse the group's leading icon. If those titles
   use the icon after the dash for the subject, follow that convention and reuse the icon for a
   matching topic or pick one for the new topic.
3. For unresolved icons, pick a group icon per [§ Groups](#groups) and a kind icon per
   [§ Default kinds](#default-kinds). If no group is specified or inferred, use the repository name
   and 🟦 when that square is free.

For example, if `🔍 [Runbook Review] - 🗄️ Storage recovery` and other titles establish a review
group with topic icons, `[Runbook Review] - Access rotation` becomes
`🔍 [Runbook Review] - 🔑 Access rotation`. For a formatted title, check both icon slots before
renaming the chat or printing the title.

## Format

`<group icon> [<Group>] - <chat icon> <Topic>`, e.g. `🟦 [agent-kit] - 🐛 Hook exit codes`.

- **Group icon**: the first glyph, shared by titles in the group.
- **Group**: the team, product, repository, or set of related chats.
- **Child chat**: inherit the parent's group prefix if it has one, unless the user supplies a
  different group. Choose the child's own chat icon and topic.
- **Chat icon**: the kind of work by default, or the subject when the group uses topic icons.
- **Topic**: when generating one, use 2–5 words naming the subject, such as `Q4 access review`.

## Groups

- **One icon per group**, used by no other group: a glyph for the group's topic, such as 🔀 for a
  repository's own setup, 🎬 for a video product, or 📱 for a mobile app.
- **Colour squares** mark groups only. A group whose topic has no fitting glyph takes a free one:
  `🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜`.
- **A new group** picks its icon per [§ Picking a new icon](#picking-a-new-icon). When no distinct
  icon is left, ask the user which groups to merge.

## Default kinds

| Kind of work                         | Icon |
| ------------------------------------ | ---- |
| Building a feature                   | ✨   |
| Fixing a bug                         | 🐛   |
| Reviewing code, a PR, or a design    | 🔍   |
| Writing docs                         | 📜   |
| Setup: agent infra, tooling, devices | 🤖   |
| Questions and research               | ℹ️   |
| Releases and deploys                 | 🚀   |

- **Same kind twice in one group**: the chats share the icon; the topic tells them apart.
- **No matching row**: take the closest row. A kind that recurs gets its own row in the repository's
  table, with an icon per [§ Picking a new icon](#picking-a-new-icon).

## Picking a new icon

- **Meaning first**: pick an icon that fits its slot. [references/icons.md](references/icons.md)
  lists checked icons by meaning. Apply the checks below to a new glyph.
- **One role**: reserve existing group icons for their groups, and colour squares for the first
  slot.
- **Distinct shape**: an icon differs in shape from every other icon in its role, so near-alike
  pairs such as 📊 and 📈 never both serve. Compare candidates at 13 px on dark and light
  backgrounds before adding one.
- **Emoji presentation**: a text-default code point (`ℹ`, `🖥`, `🛡`) renders as a monochrome glyph in
  some fonts; append U+FE0F (`ℹ️`). Check a candidate:
  `node -p '/^\p{Emoji_Presentation}$/u.test("ℹ")'`; `false` means it needs U+FE0F.
- **One glyph**: no ZWJ sequences, skin tones, or flags; a font without the sequence shows several
  glyphs.

## Applying

- **Claude Code desktop**: the session-management tools rename chats. Read this chat's title with
  `get_session` (`self`), rename with `set_session_title`, and pass the title to `start_session` for
  a chat the agent starts. On the first turn rename only a title with no group icon; the app asks
  the user before replacing a title they typed. A child chat's `get_session` (`self`) names its
  parent in `parentSessionId`: read the parent's title with `get_session`, reuse its
  `<group icon> [<Group>] - ` prefix, and pass the same prefix to `start_session` for a child the
  agent starts.
- **Bulk rename** (Claude Code desktop): when a group's or a kind's icon changes, rename every chat
  that carries it, not only recent ones. `list_sessions` returns only the latest sessions and omits
  archived ones, so also run `search_session_transcripts` with the group tag (`[<Group>]`) and a
  high `limit`. Match on the title, not the snippet, and repeat until no title carries the old icon.
  The search reads chat content, so it can miss a chat: name what it could not reach for the user.
- **Chat profiles**: a profile's recorded title follows the same tables; change it with the chat, in
  a bulk rename too.
- **Codex**: use the chat-title tool when exposed (for example, `set_thread_title`). If the user
  gives no target, rename the current chat. Confirm the final title after the tool succeeds.
- **Without a rename tool** (for example, Cursor or Claude Code CLI): print the finished title on
  one line to paste. For a bulk request, use the available titles or ask for the missing ones and
  print each finished title on its own line.
