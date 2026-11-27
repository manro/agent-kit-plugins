---
name: agent-kit-install
description: >-
  Turns on auto-update for agent-kit's marketplace in Claude Code and updates its installed plugins
  now; in Codex, refreshes the marketplace. Use when asked to update agent-kit or keep it updated,
  or when its skills look older than its latest release.
---

# Agent Kit install

## When to use

Apply when the user asks to update agent-kit, to keep it updated, or why a release is not loaded.
Claude Code updates a marketplace that is not Anthropic's only when asked, and `/reload-plugins`
only loads what is already on disk, so a new release never arrives on its own until auto-update is
on.

## Claude Code

Run from the project root, with Node 22 or later, only on the user's request: it changes their user
settings and their installed plugins.

```bash
node <this skill's folder>/scripts/dist/agent-kit-install.run.mjs
```

1. Finds the `agent-kit` marketplace in `claude plugin marketplace list`; one Claude Code does not
   know fails the run with the command that adds it.
2. Sets `autoUpdate: true` on its `extraKnownMarketplaces` entry in the user settings,
   `~/.claude/settings.json` or `$CLAUDE_CONFIG_DIR/settings.json`. A missing entry is added with
   the source Claude Code already knows; an existing one keeps its source, a pinned `ref` included.
   Every other setting stays. This key wins over the `/plugin` toggle and the default, off.
3. Runs `claude plugin marketplace update agent-kit`, then
   `claude plugin update <id> --scope <scope>` for each agent-kit plugin installed in a scope this
   folder sees.
4. Prints each plugin's version before and after.

Tell the user to run `/reload-plugins` or start a new session to load the new versions.

From then on, Claude Code updates agent-kit once per interactive session: after the first message
and a random delay of up to ten minutes, it pulls the marketplace and updates the plugins on disk,
which load on `/reload-plugins` or at the next launch.

`DISABLE_AUTOUPDATER`, `DISABLE_UPDATES`, or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, set in the
environment or the settings' `env`, stops that pass unless `FORCE_AUTOUPDATE_PLUGINS=1` is set too.
A client can set one for its own updates: a Claude desktop app session may run with
`DISABLE_AUTOUPDATER`. The run warns when one is set where it runs; on the user's yes, rerun with
`--force-plugin-updates`, which writes `FORCE_AUTOUPDATE_PLUGINS=1` into the settings' `env`. That
keeps plugin auto-update on for every marketplace whose auto-update is on, and leaves Claude Code's
own updates off.

| Flag                     | Default | Meaning                                                  |
| ------------------------ | ------- | -------------------------------------------------------- |
| `--check`                | off     | Report what would change; write and update nothing       |
| `--force-plugin-updates` | off     | Also set `FORCE_AUTOUPDATE_PLUGINS=1` in the settings    |
| `--log-level`            | `info`  | `error` hides the warning about a variable that stops it |

| Exit | Meaning                                                                        |
| ---- | ------------------------------------------------------------------------------ |
| 0    | Settings current and plugins updated, or `--check` found them current          |
| 1    | Unknown marketplace, settings that hold no object there, or a `claude` failure |
| 2    | `--check` found a setting to change                                            |

The run never passes `-y`: a marketplace that declares its own install command stops the update for
the user to confirm in a terminal. Another plugin installs with
`claude plugin install <plugin>@agent-kit`.

## Codex

The script changes nothing in Codex. Its agent-kit plugins run from the marketplace's snapshot
(`codex plugin list` shows the path), so refreshing the snapshot updates them for the next session:

```bash
codex plugin marketplace upgrade agent-kit
```
