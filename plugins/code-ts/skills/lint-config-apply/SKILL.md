---
name: lint-config-apply
description: >-
  Sets up or updates a repository's ESLint and Prettier configs from agent-kit's shared rules as a
  generated region in its own configs, merging updates with local edits. Use when the user asks to
  set up, update, or check lint or formatting config, or align lint rules with the code standards.
---

# Lint config apply

## When to use

**MUST** apply when the user asks to set up, update, or check a repository's ESLint or Prettier
configuration, or to align its lint rules with `code-standards`.

## Scope

- The repository's ESLint config (`eslint.config.{js,mjs}` or `.eslintrc.cjs`), its Prettier config
  (`prettier.config.{js,mjs}`), and the lint devDependencies in `package.json`.

## How it works

The shared setup lives once, as TypeScript templates in this skill's `assets/templates/`, which
agent-kit typechecks and lints:

| Template                 | Holds                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| `lint-shared.tpl.ts`     | Values ESLint and Prettier share: `LINE_WIDTH_CHARS`, `INDENT_WIDTH_CHARS` |
| `lint-rules.tpl.ts`      | `SHARED_RULES_MAP`, restricted syntax, type-aware rules, `max-len` options |
| `eslint.config.tpl.ts`   | The flat region: `buildSharedConfigList` and the helpers below             |
| `eslintrc.tpl.ts`        | The legacy region: `SHARED_LEGACY_CONFIG`                                  |
| `prettier.config.tpl.ts` | The Prettier region: `SHARED_PRETTIER_OPTIONS`                             |
| `*.scaffold.*`           | What a newly created config file adds below its region                     |

A region is its template with each `./*.tpl.ts` import replaced by that template's body, type-only
imports removed, and types stripped by Node; in an `eslint.config.ts` the types stay and each
module's type imports merge into one. A sibling's literal constants (`LINE_WIDTH_CHARS = 100`) are
written as their values, so the region holds `printWidth: 100`, and the legacy region also drops
`export`. It is formatted with the repository's Prettier, then written between two markers:

```js
// <lint-config 0.10.2 sha256:…>
// Generated section; edits here are kept by updates.
… generated: imports, SHARED_* constants, buildSharedConfigList …
// </lint-config>

export default [...buildSharedConfigList({ ignoresList: ["dist/"] }) /* repository overrides */];
```

The markers and the note name neither agent-kit nor this skill, so the repository's files say what
the section is without naming its source. A region written before 0.10.2, with `agent-kit:` in its
markers, is still found and is rewritten with the plain markers at its next update.

`buildSharedConfigList` also adds the layer blocks of `code-architecture` § Layers: under `**/src/`,
`layers/higher-imports` (a copy of `no-restricted-imports`) fails an import from a higher layer
through the `#<folder>/` alias or a `../` path. The legacy region has none: a legacy config cannot
define a rule copy inline, and the core rule would take over the repository's own options.

The flat region also gives the repository's own blocks three helpers, so repositories share the
mechanics while each keeps its own rules:

- `readIgnoreGlobsList(url)`: the globs of an ignore file, one per line, `#` comments skipped. A
  repository keeps them in `eslint.ignore` (ESLint 9 warns while a `.eslintignore` exists).
- `readPackageFoldersList(url)`: the folders under `src/apps/` or `src/libs/` that hold a
  `package.json`, so per-package blocks need no list to maintain.
- `buildRuleCopiesPlugin({ copy: rule })`: a plugin of existing rules (core or
  `@typescript-eslint/`) under new names. A block that sets a rule replaces its whole option list,
  so a concern on its own copy (`<ns>/barrel-syntax`) never restates the options of another block.

Everything outside the markers belongs to the repository: its overrides, ignores, extra plugins, and
its own imports. The repository may also edit lines inside the region. The start marker records a
hash of the rendering the region was written from; `assets/lint-region-history.json` keeps every
released rendering under that hash. An update is a line-by-line three-way merge of that base, the
repository's region, and agent-kit's new rendering, with all three in one Prettier layout so only
content differs. Each change gets a number:

| Change     | Meaning                                 | Default                    |
| ---------- | --------------------------------------- | -------------------------- |
| `update`   | agent-kit changed the line              | take agent-kit's line      |
| `edit`     | the repository changed the line         | keep the repository's line |
| `conflict` | both changed it, or the base is unknown | none; `--keep` or `--take` |

`--keep 2,5` keeps the repository's lines for those changes, `--take 3` takes agent-kit's, and
`--force` takes agent-kit's for every change not named in `--keep`, and rewrites a current region
with agent-kit's layout. The stamp always names agent-kit's new rendering, so an edit kept once is
an `edit` at the next update, never asked again as a conflict. A region stamped before 0.9.0 has no
recorded base: every difference is a conflict.

## Scripts

A conflict without a choice writes neither config and exits 3. A person at a terminal is asked for
those choices instead; an agent always passes `--plain`, so it never is. `--help` lists the flags.

`scripts/` is a package, `@manro/agent-kit-skill-lint-config-apply`, laid out like an app
(`code-architecture` § Package anatomy) and run by plain Node 22.18: code in `src/`, suites in
`test/`. Its `package.json` maps `#lint-config-apply/*` to `./src/*`; `src/index.ts` holds the type
root `LintConfigApply`, which each module's `declare module` block extends; `src/app.ts` is the
private barrel `LINT_CONFIG_APPLY`, nested like the folders; `test/` mirrors `src/`. Paths below are
under `src/`.

| Path                         | Holds                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| `lint-config-apply.run.ts`   | The entry: runs `ApplyCommand` and prints its report                   |
| `lint-history-record.run.ts` | agent-kit's maintainer entry: runs `RecordCommand`                     |
| `cli/`                       | Typed report renderers, shared by plain and terminal output            |
| `cli/commands/`              | `apply.command.ts`, `record.command.ts`: parse flags, wire, run        |
| `config/`                    | `config-kinds.config.ts`: each kind's template, scaffold, file, syntax |
| `base/`                      | The roles several concepts share, the checkout and Prettier adapters   |
| `core/region/`               | Codec, renderer, file writer, history recorder, and their adapters     |
| `core/merge/`                | `ThreeWayLineMerger`, `HunkChoicePolicy`                               |
| `core/target/`               | `ConfigTargetFinder`, `LintPackagesChecker`                            |
| `core/composer/`             | `TargetPlanner` and `LintConfigApplier`, the apply workflow            |
| `test/`                      | node:test suites mirroring the folders, and the `barrelLoad` guard     |

Each command is its pipeline's one wiring point: it reads the classes from the barrel, creates the
adapters, the config, the codec, and every domain object, and hands each its collaborators through
the constructor. Core returns typed report data; commands render and print it. Below `cli/`, a
module imports other modules' types from the type root and nothing else, apart from the error it
throws. Short-lived working objects stay private to the class that needs them (`TemplateCollector`,
`MergeWalk`).

## Workflow

1. From the repository root, run:

   ```bash
   node <this skill's folder>/scripts/dist/lint-config-apply.run.mjs --plain --check
   ```

2. Act on each line it prints:
   - `current`: nothing to decide; `local edits kept` means the region holds the repository's edits
     and agent-kit has nothing new.
   - `missing`: rerun without `--check` to create the config.
   - `stale` or `merge`: the numbered changes follow. Show the user one short list: the options
     agent-kit will overwrite (`update`), the repository's options that stay (`edit`), and each
     conflict with both values. Ask which updates to refuse, which edits to overwrite, and which
     side wins each conflict. Never decide a conflict, and never overwrite an `edit`, without the
     user's answer.
   - `unmanaged`: the repository has its own config (for example `.prettierrc.json` or
     `.eslintrc.json`). Propose the conversion to the user: create the managed file, move the old
     file's settings below the region so they still apply, delete the old file, and prove that
     `eslint --print-config <file>` and Prettier's resolved options are unchanged on a few
     representative files.
   - `ignored`: a second config of the same kind; ask which one the repository uses.
   - `packages`: the listed packages are missing; install them as devDependencies with the
     repository's own package manager, after the user agrees.

3. Run the script with `--plain` and without `--check`, passing the user's choices as `--keep` and
   `--take` with the numbers from step 1, then the repository's lint and format scripts.
4. A repository on the legacy format passes `--legacy` the first time, so the script creates
   `.eslintrc.cjs`; later runs find it by its region.

## Rules

- Never add an agent-kit package to the repository's dependencies; the generated region is the whole
  delivery.
- Prefer repository-specific rules outside the region, as overrides after the generated configs; an
  edit inside the region is kept, but every agent-kit change to the same line becomes a question. A
  rule that should apply everywhere belongs in `assets/templates/lint-rules.tpl.ts` (or
  `lint-shared.tpl.ts` for a value both tools use), released through agent-kit.
- In agent-kit, run this skill's `lint-history-record.run.ts` entry from its sources after a
  template change and commit the history file with it; `validate.sh` fails until the new rendering
  is recorded. A source checkout's plugin manifest names no version, so a run from the sources
  passes `--plugin-version` with the version in agent-kit's `package.json`; an installed plugin's
  manifest carries it.
- Follow the repository's module format: `.js` files when `package.json` has `"type": "module"`,
  `.mjs` otherwise; the legacy ESLint config is CommonJS (`.eslintrc.cjs`).
- Requires Node 22.18 or later, which strips the templates' types for a JavaScript region.
- An `eslint.config.ts` needs ESLint to load TypeScript: on Node 22.18 or later pass
  `--flag unstable_native_nodejs_ts_config` in the lint script (agent-kit does), or install `jiti`.
  Convert by renaming the file and rerunning; the region is then rewritten with types.

| Exit | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| 0    | Done; every region is current or was written            |
| 1    | Bad arguments, or an unmanaged config needs a decision  |
| 2    | `--check` found something to write                      |
| 3    | A conflict has no `--keep` or `--take`; nothing written |
