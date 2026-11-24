# @manro/lib-paths

Named paths under a root found by a marker file, instead of `..` climbed from wherever a module
sits. The marker keeps the anchor in a bundle: a skill's bundled chunk ships without a
`package.json`, so it anchors on its own `SKILL.md` or its plugin's `plugin.json`.

| `PATHS.`                | Holds                                                             |
| ----------------------- | ----------------------------------------------------------------- |
| `PathsRootMissingError` | No folder above the module holds the marker                       |
| `PathsService`          | `rootPath`, found on first use, and `getPath(name)` for each name |

```ts
import { PATHS } from "@manro/lib-paths";

const skillPathsService = new PATHS.PathsService({
  moduleUrl: import.meta.url,
  relativePathsMap: { templatesDir: "assets/templates" },
  rootMarkerName: "SKILL.md"
});

skillPathsService.getPath("templatesDir"); // <skill>/assets/templates
```

`rootPath` is the nearest folder at or above the module that holds the marker (`package.json` by
default), found on first use and cached; none throws `PathsRootMissingError`, which names the marker
and the module. A repository script anchors on `pnpm-workspace.yaml`. Skill entries keep
`process.cwd()`: they work on the user's repository, not their own.

Used by code-standards (its suites), lint-config-apply, validate, and build-release.
Dependency-free; Node only (`node:fs`, `node:url`).
