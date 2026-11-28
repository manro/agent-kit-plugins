# agent-kit plugins

Skills for Claude Code, Codex, and Cursor, published as the `agent-kit` plugin marketplace. Each
plugin serves one kind of repository, so a repository enables only the skills that apply to it. This
page describes release `v0.36.0`.

| Plugin          | For                                                                | Skills |
| --------------- | ------------------------------------------------------------------ | -----: |
| `dev-workflow`  | Any repository                                                     |     11 |
| `code-ts`       | TypeScript repositories, React and Electron apps included          |      9 |
| `wiki`          | Repositories that keep a Markdown knowledge base                   |      6 |
| `agents-infra`  | Repositories with agent rules in `AGENTS.md` and `.agents/skills/` |      2 |
| `ci`            | Repositories whose workflows run on GitHub Actions                 |      2 |
| `system-design` | Designing systems, services, and the changes between them          |      0 |

The `release` branch holds the marketplace: the two catalogs and the plugins as installed, each
skill's scripts bundled and ready to run. Each release is tagged `v<version>`. CI builds both from a
separate source repository, so this repository takes no pull requests.

## Skills

`dev-workflow`:

- `architect-review`: reviews what a pull request, branch, or plan brings in, or a wider area when
  asked, and reports only critical issues, blockers first, as what, effect, and a fix tip that needs
  verification, drawing a blocker's failure beside its proposed fix, ready to post on GitHub.
- `chat-model-suggest`: suggests a model tier and effort for the rest of a chat's work, per phase.
- `chat-title`: names chats by group and kind, and renames them where the client allows.
- `code-annotation`: keeps only the code comments that name the bug their absence invites.
- `commit-message`: writes a 5-7 word commit subject without changing Git state.
- `pr-description`: writes or updates a pull request's title and description for reviewers.
- `session-lessons`: proposes a session's generic decisions and corrections as short rules.
- `visual-explain`: explains a design, flow, or trend in few words, and draws a Mermaid diagram or
  chart only when the reader must hold three or more connected parts, or a failure beside its fix.
- `agent-kit-install`: turns on auto-update for this marketplace in Claude Code and updates the
  installed plugins now, and refreshes the marketplace in Codex, in one run; `--all` also installs
  the plugins either client is missing.
- `ponytail`: pushes toward the simplest solution that works. From
  [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), MIT.
- `stop-slop`: strips AI writing tells from prose. From
  [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop), MIT.

`code-ts`:

- `code-standards`: classes with private state, names, constructors, layout, composition, typed
  events and errors; with a naming checker.
- `code-architecture`: package boundaries, layers, composition roots, scripted pipelines, state, and
  validation.
- `code-unit-tests-architecture`: `node:test` suites that mirror `src/`, typed fakes, temp folders.
- `code-ops-commands`: commands that change live systems prove access and show their plan before
  they write, confirm by blast radius, and report what changed.
- `code-simplifier`: refines recently changed code without changing what it does.
- `code-linter`: runs the project's lint check after edits, with scoped auto-fixes.
- `lint-config-apply`: writes the shared ESLint and Prettier rules into a repository's own configs
  as one generated region, and merges later updates with local edits.
- `react-architecture`: components that only render, effects in named hooks, feature folders, and
  state read through selectors, on the repository's own state and styling libraries.
- `electron-architecture`: a program per process, sandboxed windows on a privileged scheme, a typed
  preload bridge, fuses, signing and notarizing, updates from a feed, and the release workflow.

`wiki`:

- `wiki-config`: creates a vault of captures in `raw/` and topic pages that cite them, or lists an
  existing vault's gaps against that template; it stays plain Markdown and opens in Obsidian.
- `wiki-ingest`: captures a URL, file, or pasted text and writes or updates the page that cites it,
  or a dated section in a series ledger.
- `wiki-lint`: checks page names, frontmatter, links, orphans, uncited captures, and line width; a
  vault turns a check off by name, or for some paths only.
- `wiki-maintenance`: answers from the pages, and updates, moves, merges, and drops pages.
- `chat-wiki-checkpoint`: saves a recurring chat's setup as a profile page in the vault.
- `chat-wiki-resume`: restores a chat from its profile and briefs the user before any work.

`agents-infra`:

- `agents-infra-audit`: checks the agent docs' paths and links, skill frontmatter and names, MCP
  templates, and line length, and prints the token budget and its change; a repository turns a check
  off by name, or for some paths only.
- `claude-skill-links`: links each skill in `.agents/skills/` into `.claude/skills/`, except where
  git keeps the skill and would show its link in `git status`; its Claude Code hook syncs the links
  at startup.

`ci`:

- `ci-github-actions`: least-privilege permissions, pinned actions, event data kept out of scripts,
  one environment per target, checks split into parallel jobs only where timings show it pays, one
  build that ships, and releases run by hand behind a version gate.
- `ci-cloud-oidc`: keyless access to AWS and Google Cloud from a workflow, each identity trusted
  from one environment and allowed one folder, with Terraform roles and a `gcloud` setup.

`system-design` has no skills yet. It will hold only design practice proven in real systems; until
then, skip it.

## Install

Skip the plugins a machine never needs.

Claude Code:

```sh
claude plugin marketplace add manro/agent-kit-plugins#release
claude plugin install dev-workflow@agent-kit
claude plugin install code-ts@agent-kit
claude plugin install wiki@agent-kit
claude plugin install agents-infra@agent-kit
claude plugin install ci@agent-kit
claude plugin install system-design@agent-kit
```

Codex CLI:

```sh
codex plugin marketplace add https://github.com/manro/agent-kit-plugins.git --ref release
codex plugin add dev-workflow@agent-kit
codex plugin add code-ts@agent-kit
codex plugin add wiki@agent-kit
codex plugin add agents-infra@agent-kit
codex plugin add ci@agent-kit
codex plugin add system-design@agent-kit
```

Cursor imports the plugins installed in Claude Code.

To hold one version, use its tag, such as `v0.36.0`, in place of `release`.

A repository that enables plugins for everyone who opens it registers the marketplace in its
`.claude/settings.json` and lists the plugins it needs:

```json
{
  "extraKnownMarketplaces": {
    "agent-kit": {
      "source": { "source": "github", "repo": "manro/agent-kit-plugins", "ref": "release" },
      "autoUpdate": true
    }
  },
  "enabledPlugins": { "dev-workflow@agent-kit": true, "code-ts@agent-kit": true }
}
```

## Use

Start a new session after installing. Skills load on their own when a prompt matches them, and run
by name: `/dev-workflow:commit-message` in Claude Code, `$commit-message` in Codex, and
`/commit-message` in Cursor.

Each plugin adds a short startup hint on when to use its skills. In Codex, trust the hook in
`/hooks` to receive it.

agent-kit keeps nothing of its own in a repository: skills read what they need from its `AGENTS.md`
and the conventions the clients share, and ask when neither answers.

## Update

Claude Code auto-updates only Anthropic's marketplaces unless told otherwise, and `/reload-plugins`
loads only what is already on disk. Ask for `agent-kit-install` once: it sets `autoUpdate` on this
marketplace in the user settings, updates the installed plugins now, and refreshes the marketplace
in Codex too; with `--all` it also installs the plugins either client is missing. Later releases
then arrive during a session and load at the next launch or on `/reload-plugins`. A Claude desktop
app session may run with `DISABLE_AUTOUPDATER` set, which skips that pass; the skill's
`--force-plugin-updates` keeps plugin updates on there.

By hand, in Claude Code:

```sh
claude plugin marketplace update agent-kit
claude plugin update dev-workflow@agent-kit
```

In Codex, which runs the plugins from the marketplace's copy:

```sh
codex plugin marketplace upgrade agent-kit
```
