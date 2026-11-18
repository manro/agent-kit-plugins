# agent-kit plugins

Skills and workflows for Claude Code and Codex, published as the `agent-kit` plugin marketplace.

| Plugin         | What it holds                                                                           |
| -------------- | --------------------------------------------------------------------------------------- |
| `dev-workflow` | Architecture review, code annotation, commit messages, minimal solutions, prose cleanup |
| `code-ts`      | TypeScript standards, architecture, tests, ops commands, lint configs                   |

The `release` branch holds the marketplace: the catalogs and the plugins as installed. Each release
is tagged `v<version>`. CI builds both from a separate source repository, so this repository takes
no pull requests.

## Install

Claude Code:

```sh
claude plugin marketplace add manro/agent-kit-plugins#release
claude plugin install dev-workflow@agent-kit
claude plugin install code-ts@agent-kit
```

Codex CLI:

```sh
codex plugin marketplace add https://github.com/manro/agent-kit-plugins.git --ref release
codex plugin add dev-workflow@agent-kit
codex plugin add code-ts@agent-kit
```

Cursor imports the plugins installed in Claude Code.

To hold one version, use its tag, such as `v0.14.3`, in place of `release`.

A repository that enables the plugins for everyone who opens it registers the marketplace in its
`.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "agent-kit": {
      "source": { "source": "github", "repo": "manro/agent-kit-plugins", "ref": "release" }
    }
  },
  "enabledPlugins": { "dev-workflow@agent-kit": true, "code-ts@agent-kit": true }
}
```
