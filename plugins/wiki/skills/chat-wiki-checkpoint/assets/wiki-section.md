## Chat profiles

`chats/<slug>.md` is the master prompt of one recurring chat: its purpose, scope, how it works, and
what a restored chat reads first, so any client can restore it. A profile starts from
`_templates/chat.md` and is listed in `chats/index.md`. It describes the chat, never its progress,
and its body holds no value that goes stale: commit hashes, ids, dates, counts, or run results. A
checkpoint rewrites a profile whole: profiles keep no `## Superseded` section, and git keeps their
history. The `chat-wiki-checkpoint` skill writes profiles and `chat-wiki-resume` restores a chat
from one.
