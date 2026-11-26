---
name: chat-title
description: >-
  Names chats as `<group icon> [Group] - <kind icon> Topic`: each group's icon, a topic glyph or a
  colour square, lines its chats up in the sidebar, and the kind icon marks the kind of work. Use
  when a chat starts, when naming or renaming a chat, session, or thread, or when asked for chat
  icons.
---

# Chat titles

## When to use

**MUST** apply when:

- A chat starts and the client lets the agent rename it (first turn only).
- The agent names a chat, session, or thread it starts for the user.
- The user asks to name, rename, or add an icon to chats.

## Scope

Activity-triggered: chat titles in Claude Code, Cursor, and Codex. No path scope.

## Repository facts

Read these from the repository before naming:

- **Its groups and kinds**: wherever `AGENTS.md`, or a doc it links, lists chat-title groups (group,
  icon) and kinds (kind of work, icon). They replace the defaults below.
- **Its chat profiles**, if it keeps any: saved chat setups that record a chat's title, such as a
  `chat` field.
- **Without a table**: the only group is the repository's name with 🟦, and the kinds are
  [§ Default kinds](#default-kinds).

## Format

`<group icon> [<Group>] - <kind icon> <Topic>`, e.g. `🟦 [agent-kit] - 🐛 Hook exit codes`.

- **Group icon**: the first character, the group's icon.
- **Group**: the team, product, or repository the chat serves.
- **Child chat**: a chat started from another one (a subtask, a fork, or a chat the agent starts)
  keeps the parent's group icon and group when the parent's title has them; only its kind icon and
  topic are its own. A parent without a group prefix leaves the child to pick one as usual.
- **Kind icon**: the icon for the kind of work.
- **Topic**: 2-5 words naming the subject, not the request: `Q4 access review`, not
  `Help with review`.

## Groups

- **One icon per group**, used by no other group: a glyph for the group's topic, such as 🔀 for a
  repository's own setup, 🎬 for a video product, or 📱 for a mobile app.
- **Colour squares** mark groups only. A group whose topic has no fitting glyph takes a free one:
  `🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜`.
- **A new group** in the repository's table picks its icon per
  [§ Picking a new icon](#picking-a-new-icon). When no distinct icon is left, ask the user which
  groups to merge.

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

- **Meaning first**: the icon says the group's topic or the kind of work at a glance.
  [references/icons.md](references/icons.md) lists checked icons by meaning; any other glyph must
  pass the checks below.
- **One role**: in one repository an icon marks one group or one kind, never both. A kind icon is
  never a colour square.
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
- **Cursor, Codex, Claude Code CLI**: the agent cannot rename the chat. When the user asks, print
  the title on one line to paste, with the parent's group prefix when the user or the hand-off names
  the parent chat. For a bulk rename, ask for the chats' current titles, then print each with its
  new title, one per line.
