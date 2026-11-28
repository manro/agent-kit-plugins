---
name: code-architecture
description: >-
  Architecture standard for TypeScript apps, libraries, and skill and repository scripts: package
  boundaries, layers, composition roots, scripted pipelines, state, cancellation, workers, and
  validation. Use when creating, moving, or reviewing packages or scripts, or adding dependencies.
---

# Code Architecture

How TypeScript packages and skill scripts are built. The consuming repository names its scope, its
libs ([§ Lib roles](#lib-roles)), and its checks in its own wrapper skill or AGENTS.md. Examples use
`report-builder` (`RB` / `Rb`) and `@<scope>/lib-zip` (`ZIP` / `Zip`).

**The consuming repository owns its layout and toolchain.** Read its wrapper skill or `AGENTS.md`,
then check the existing packages and CI for package names, workspace layout, package manager,
TypeScript runtime, and launch commands. Preserve those choices in an existing project, and read
each rule through the repository's shape ([§ Repository shapes](#repository-shapes)). Use the
package layout below as the default where the project has no established choice. Its rules hold
under any package manager; its commands are spelled for pnpm and tsx, and a repository on npm, Yarn,
or Bun runs the same scripts through its own manager. Ask when a real conflict would change existing
package boundaries or entry points. `code-standards` decides the shape of code inside a module; this
skill decides where code lives, which package owns it, and how packages connect.

## When to use

**MUST** apply when creating, moving, renaming, or splitting a module, folder, or package of the
repository (in the default layout, under `src/apps/` or `src/libs/`) or of a skill's `scripts/`;
adding or moving a dependency; deciding whether code belongs in a skill script, an app, or a lib;
turning a shell script that grew past a few commands into a script package; and reviewing any change
in those locations.

## Scope

- Each package's code and tests: `src/apps/**` and `src/libs/**` in the default layout, the
  repository's own package folders, or the root `src/` of a single-package repository
- The code and tests owned by a skill's `scripts/`
- The workspace manifest, environment tsconfig bases, and the lint config's package overrides

## Repository shapes

The rules spell paths in the default layout. Read them through the shape the repository already has:

| Shape                                                                 | App                                                                                    | Lib, or a role lib                                                                    | Not used                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| One package at the root (`package.json`, `src/`, `test/`)             | The root package, its `src/` per the app rows of [§ Package anatomy](#package-anatomy) | A folder of its base layer (`src/base/log/`), reached through the package's own alias | `src/apps/`, `src/libs/`, the workspace list, the root fan-out, `bin/run.sh`, and `app:<folder>`: root scripts run the entries |
| A workspace in the default layout                                     | `src/apps/<app>/`                                                                      | `src/libs/<lib>/`                                                                     | —                                                                                                                              |
| A workspace in its own layout (`apps/` and `packages/`, `packages/*`) | Its app folder                                                                         | Its library folder                                                                    | The default folder names and the `lib-` and `app-` name prefixes                                                               |

- **The shape stands.** New code follows the repository's shape; a single-package repository gets no
  `src/apps/`, `src/libs/`, or workspace to fit these rules. When a change needs a second package (a
  second app, a lib two packages share), propose the split to the user before making it.
- **An existing package keeps its name.** A package, folder, or module the repository already has
  keeps its name, place, and exports, even where it breaks the default prefixes or fills a role
  under its own names ([§ Lib roles](#lib-roles)). The naming rules here and in `code-standards`
  name new code; renaming existing code is a migration the user asks for, never a side effect of
  another change.
- **The rules inside a package hold in every shape**: layers, barrels, role suffixes, and tests.
  Where an existing package settled one of them its own way, follow the package and name the
  difference in the review instead of converting it.

## Where code lives

| Code                                                                    | Home                      |
| ----------------------------------------------------------------------- | ------------------------- |
| Workflow, judgement, review steps, user-edit protocol, delegation       | The skill's `SKILL.md`    |
| Inputs for one use: profiles, starter files, brand rules                | The skill's `assets/`     |
| Tooling owned and run by one skill                                      | The skill's `scripts/`    |
| An engine with an independent workflow or an input contract to document | An app, `src/apps/<app>/` |
| Code two packages use                                                   | A lib, `src/libs/<lib>/`  |

The homes name the default layout; [§ Repository shapes](#repository-shapes) maps them to others.

- **One home per domain.** A domain is one area of knowledge the code relies on: an operating
  system, an external service, a file format, a tool, a workflow. Everything that belongs to it —
  its entities and types, the abstractions over it, its constants and paths, its configuration, and
  the adapters that reach it — lives in one home: the package that owns the domain, or one folder
  inside a package while only that package needs it. Every other place imports from that home. A
  second copy, even one line or one literal, is a defect: copies drift, and a reader cannot tell
  which one is right. A consumer keeps only what is its own — which part of the domain it uses and
  why — and asks the home for the rest. When a second package needs a domain that lives inside one
  package, the domain moves to a lib; it is never copied. The bullets below apply this rule; the
  lint and the checks enforce the parts they can.
- **An app is generic.** Every specific — template, profile, content, output path — arrives on argv
  or in a file named on argv. Nothing defaults to one template: report-builder requires
  `--profile <path>`, so a second template needs a profile, not code.
- **The skill calls the app through its documented entry point.** It does not import `src/`. The
  app's README and `docs/` own the engine facts (commands, input contract, engine notes) and
  `SKILL.md` links them instead of restating them. A behaviour change goes into the app, where every
  caller gets it.
- **A lib waits for its second consumer.** Code generic in shape but used by one package stays in
  that package until a second package needs it.
- **An operating system's layout lives in its platform lib.** Where the system installs
  applications, where it keeps per-user data, caches, and sandboxed app storage, and where its
  package managers put tools are facts of the platform, not of the package that needs them. The
  platform's lib exposes them as named paths built from what the caller passes in (a home folder, an
  application or bundle name); a package passes its own specifics and never spells a platform
  location itself, so supporting another system, or a new install location, changes one lib. The
  lint rejects platform locations outside the platform's lib and tests.

## Skill script packages

A one-file helper can stay directly in the skill's `scripts/`. For a skill-owned package, use
`scripts/package.json` as the package boundary, `scripts/src/` for implementation, and
`scripts/test/` for suites that mirror it, and `scripts/README.md` per
[§ README contract](#readme-contract). Keep the manifest, source, and tests inside the same package
so local imports resolve in each. `SKILL.md` tells the agent how to run the scripts; the README
tells the people who change them how they work, and neither restates the other. Preserve an existing
package boundary when splitting modules or moving tests, unless the task or repository's conventions
call for changing it.

Use `*.run.ts` for TypeScript entry points. Follow the repository's layout for their placement and
its supported runtime for launching them. When moving an entry point, update its callers and verify
the normal launch path.

## Scripted pipelines

A repository's own runs (its checks, a release build, smoke tests of what it ships, a setup) start
as a few shell lines and grow. Shell stays right while a person reads it at a glance; past that, no
one can say what a run does or in what order.

- **A shell script stays a few commands in a row**: clear a folder, copy a tree, call the build.
  Once it holds named steps, branches, loops over files it finds, temporary fixtures, assertions, or
  values read out of JSON, it becomes a script package laid out like an app
  ([§ Package anatomy](#package-anatomy)), with suites.
- **One plan module lists the whole run**: each part and its steps in order, each step one command
  or one call under a title a person reads (`names in scripts/validate`). That file alone says what
  the run does; nothing else adds, reorders, or drops a step, and what the plan reads from the
  checkout (the paths a pattern matches, the release version) reaches it as values.
- **One runner runs every step**: it prints the step's title and command before it starts, shows the
  command's own output as it comes, then how the step ended and how long it took. It stops at the
  first failure and ends with each part's time. A step that cannot run here, such as a tool CI
  lacks, is listed as skipped with its reason, never dropped in silence.
- **Parts and shards are chosen by flag** (`--part test:2/3`), so a CI job per part
  (`ci-github-actions` § Parallel checks), a developer rerunning one part, and the pre-commit hook
  all call the same script.
- **Its suites run the plan, the choice of parts, and the runner over fakes**; the repository's own
  run of the script is the real run of its adapters.

## Dependency direction

```mermaid
flowchart LR
  skill["skill"] -->|"documented command"| app["@<scope>/app-<folder>"]
  app --> lib["@<scope>/lib-<folder>"]
  lib --> other["@<scope>/lib-<folder>"]
```

- Nothing under `src/` imports the skill tree.
- A lib never imports an app. An app never imports another app; code both need moves into a lib.
- A lib may depend on another lib (the PDF lib on the platform lib); the graph stays acyclic.
- A package reaches another only through its barrel, `@<scope>/lib-<folder>` or
  `@<scope>/app-<folder>`. `exports` lists only `.`, so a deep path does not resolve.
- Only a `<name>.adapter.ts` file imports a process or native library (`node:child_process`, resvg,
  Prism, puppeteer, mermaid-cli) or the API of the host the app runs inside (an editor's, a desktop
  shell's, a browser's extension API); the rest of the code calls the adapter. An Electron main
  process keeps its host calls in its `shell/` entry layer instead (`electron-architecture` §
  Layout). An app with several tools to run keeps one process runner in `base/`
  (`RB.base.ProcessRunner`), and each tool's wrapper takes it as a collaborator, so its arguments
  and parsing test without a process. An OS facility two apps use (`osascript`, `textutil`, `zip`,
  Office export) is a lib adapter.
- A process takes its inputs as an argv array through `execFile`, never interpolated into a shell
  command or script text, so a path with quotes or spaces cannot break out.
- **The host is an outside system.** In an app that runs inside a framework's process, the code that
  does the app's work imports neither the framework nor its types. Each need of the host (windows,
  dialogs, notifications, storage paths, its message bus) is a port in the concept's `types.ts` that
  a host adapter implements; an adapter with no other use for the host gets the host's functions
  passed in by the composition root (the host's `fetch` as its `Fetch` port). The work then tests on
  fakes, with no host running.
- **Errors are translated where they are understood.** The adapter that runs requests gives every
  call a timeout and turns a network failure into its unreachable error; the API client over it
  turns an error status into its API error, carrying the server's own message (and surviving a
  proxy's HTML error page); the same client maps the statuses that mean something to its callers
  into their outcomes or errors (409 "already running" → busy), per `code-standards` § Outcomes and
  faults. Nothing above the client reads a status code or a transport error.

ESLint enforces the import rules. The overrides for `src/apps/**/*.adapter.ts` and
`src/libs/**/*.adapter.ts` are the allowlist, so a new adapter needs only its suffix.

## Lib roles

The rules here, in `code-standards`, and in `code-unit-tests-architecture` lean on a few libs by
role. The repository's wrapper skill names the package that fills each role it has, and maps its own
spellings to the names below, except where a checker takes a name as a flag (`--event-base`). A role
used by one package stays inside it until a second needs it
([§ Where code lives](#where-code-lives)); a role nothing needs gets no package.

**A role the repository already fills keeps its own names.** Its logger, configuration loader, or
command-line framework, as a package or as a module, keeps its package name, file names, and
exports; the wrapper skill maps them to the role names, and the rules read the role names as that
mapping. Add only a part the rules need and it lacks (a silent logger, a memory sink), inside it and
in its own naming. Never replace it with the reference below or wrap it to rename it.

| Role           | Owns                                                                     | The rules use                                                                                   |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Env lib        | Reading `process.env`; no other module reads it                          | `EnvService` over typed declarations: `values`, `read(source)`                                  |
| Paths lib      | Paths under a root found by a marker file, never by `..`                 | `PathsService`: `getPath(name)`                                                                 |
| Log lib        | Diagnostics apart from results, secret redaction; `universal`            | A logger interface and its silent form, a sink, an `Output`, memory sink and output             |
| Server log lib | Writing logs and outputs to the process streams                          | A stream sink, log options from flags and variables, stdout and stderr outputs                  |
| CLI lib        | Argv parsing, command dispatch, exit codes                               | The runner, `Command`, `CliUsageError`, `io` (`output`, `errorOutput`, `logger`), a memory `io` |
| Event lib      | Typed publish-subscribe                                                  | `EventerBase<Listeners>`, `Listenable<Listeners>`; the only `abstract` and `protected`          |
| Platform lib   | Where the system installs applications and keeps data, caches, and tools | Named paths built from what the caller passes in                                                |

**Start a missing role lib from its reference.** This skill ships a working lib with its suites for
each role but the platform lib: `references/libs/env/`, `references/libs/paths/`,
`references/libs/log/`, `references/libs/log-server/`, `references/libs/cli/`, and
`references/libs/eventer/`. Its README states the contract. In a workspace, copy the folder into the
repository's libs folder, then name the package the way the repository names its libs, point its
`tsconfig.json` at the repository's environment base
([§ Environment tsconfigs](#environment-tsconfigs)), rename its imports of the other role libs,
spell their dependencies the way the package manager links a workspace package
([§ Package anatomy](#package-anatomy)), and install with that manager. In a single-package
repository, copy only its `src/` modules into a folder of the package's base layer, add them to the
package's barrel in place of the lib's own, and move its `#<lib>/` imports and `declare module`
blocks to the package's alias and type root. Its own layer folders come along inside that base
folder (`base/log/core/logger/`): the layer lint reads a path from the alias, so they stay base
code.

## Layers

A package is built bottom-up in three layers, and a module imports only from its own layer or the
ones below it:

1. **Base** (`base/`, and `config/` beside it) — what knows none of the package's concepts. `base/`
   holds stateless functions in `base/utils/`, generic classes (a cache, an Observer), an adapter no
   concept owns (a process runner), and the errors they throw. `config/` holds the package's
   settings and static inputs; every layer may read it, and it imports nothing above it.
2. **Core** (`core/<concept>/`) — the package's concepts: their types and interfaces in the folder's
   `types.ts`, the rules, the classes that hold them, their typed errors, and the adapters and
   strategies that implement the concept's interfaces, beside the code they serve. An adapter that
   implements a concept's interface lives with that concept, never in `base/`.
3. **Implementation** — what wires and runs the core: the composition root and use cases in
   `core/composer/`, and the entry layer (`cli/` and the `*.run.ts` entries in an app; in a lib, the
   ready instances its barrel hands out). No concept imports it.

```mermaid
flowchart TB
  impl["implementation (core/composer/, cli/, *.run.ts)"] -->|imports| core["concepts (types, rules, their adapters)"]
  core -->|imports| base["base/ and config/"]
```

- **Decompose before writing.** For a new package, or a module that grew a second job, name what is
  base (it knows none of the package's concepts), what is core (a concept and its contract), and
  what wires them, then give each its folder. A module that mixes layers splits along them: a
  command-line module holding an argv tokenizer, a flag reader with its usage error, and the run
  loop that dispatches commands becomes `base/utils/argv-parser.ts`, `core/` for the reader and the
  error, and the runner on top.
- **The lint region fails an import from a higher layer**, through the `#<folder>/` alias or a `../`
  path: `base/` or `config/` importing `core/` or `cli/`, a concept importing `core/composer/` or
  `cli/`, and `core/composer/` importing `cli/`. A barrel the module imports is not followed, so a
  module reaches only its own layer and the ones below through it.
- **The same split holds between packages.** Contracts and environment-free logic live in a
  `universal` lib; the implementation for one environment or tool lives in a lib or app on top of it
  (a log lib of loggers and sink interfaces, a server log lib of the sinks that write to a process),
  never the reverse.
- **Every package has the same layers, from its first module.** A lib uses the layer folders an app
  does: `config/`, `base/`, and `core/<concept>/`, with ready instances that only wire concepts in
  `core/composer/`; `src/` holds nothing but `index.ts` and those folders, and an empty layer has no
  folder. A one-module lib still puts its module in a concept folder, so a lib that grows adds
  modules and never moves the ones it has.

## Package anatomy

In the default layout, each folder under `src/apps/` and `src/libs/` is a private workspace package,
listed in the package manager's workspace list (`pnpm-workspace.yaml`, or `workspaces` in the root
`package.json` under npm, Yarn, and Bun) and consumed as TypeScript source through tsx. Apply the
checks for this layout where the repository adopts it. For an existing layout, use its package
boundaries and launch path. In a single-package repository the table describes the root package: its
`package.json` keeps its own name, and its scripts run the entries.

| Path                         | Lib                    | App            | Holds                                                                                                                                                                                                         |
| ---------------------------- | ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`               | ✅                     | ✅             | `name` `@<scope>/lib-<folder>` or `@<scope>/app-<folder>`, `private`, `type: module`, `exports: { ".": "./src/index.ts" }`, `imports: { "#<folder>/*": "./src/*" }`, `typecheck` and `test` scripts, own deps |
| `tsconfig.json`              | ✅                     | ✅             | `extends` one [environment base](#environment-tsconfigs); `include` `src/**/*.ts`, plus `test/**/*.ts` when tests exist                                                                                       |
| `README.md`                  | ✅                     | ✅             | Per [§ README contract](#readme-contract)                                                                                                                                                                     |
| `src/index.ts`               | Barrel and type root   | Type root only | Per [§ Packages, namespaces, barrels](#packages-namespaces-barrels)                                                                                                                                           |
| `src/app.ts`                 | —                      | ✅             | The private barrel, grouped by folder                                                                                                                                                                         |
| `src/cli.run.ts`             | —                      | ✅             | The entry: passes `process` as the CLI lib's runner's argv source with the command list and sets `process.exitCode` from its result                                                                           |
| `bin/run.sh`                 | When it has an entry   | ✅             | Executable; `run.sh <entry> [args…]` runs `src/<entry>.run.ts` through tsx. The same bytes in every package                                                                                                   |
| `src/cli/commands/`          | —                      | ✅             | One command interface implementation per `<name>.command.ts`                                                                                                                                                  |
| `src/cli-interactive.run.ts` | —                      | When needed    | A menu entry over the same pipeline, run as the root script `app:<folder>:interactive`; its modules in `src/cli/interactive/`                                                                                 |
| `src/base/`                  | When needed            | When needed    | The [base layer](#layers): building blocks no concept owns, shared interfaces, generic classes, and concept-free adapters (a cache, an Observer, a process runner)                                            |
| `src/base/utils/`            | When needed            | When needed    | Stateless functions that import nothing from `core/`, one topic per file (`units.ts`, `time-formatter.ts`); no classes                                                                                        |
| `src/core/<concept>/utils/`  | When needed            | When needed    | Stateless functions over that concept's data, one topic per file (`catalog-entries.ts`); no classes                                                                                                           |
| `src/config/`                | When needed            | When needed    | Runtime configuration and static inputs the package ships (paths, prompt files, its env and paths services), beside the [base layer](#layers)                                                                 |
| `src/core/<concept>/`        | ✅                     | ✅             | The [core layer](#layers): one folder per concept (`core/deck/`, `core/verify/`), adapters beside the domain code they serve                                                                                  |
| `test/`                      | When it has pure logic | ✅             | node:test suites mirroring `src/`, per `code-unit-tests-architecture`                                                                                                                                         |
| `docs/`                      | —                      | When needed    | An input contract too large for the README (`deck-format.md`)                                                                                                                                                 |

- **Code lives in `src/`, tests in `test/`, the launcher in `bin/run.sh`.** Nothing else sits at the
  package root; the checks fail on an entry outside the table.
- **Dependencies live where they are imported.** A dependency on a workspace package takes the
  manager's local form: `workspace:*` under pnpm, Yarn, and Bun, a version range under npm. pnpm's
  non-hoisted `node_modules` and Yarn Plug'n'Play turn an undeclared dependency into an error; a
  hoisted `node_modules` (npm, Yarn's `node-modules` linker) resolves it until the package moves, so
  review checks the declarations there. The root keeps the tooling (ESLint, Prettier, TypeScript,
  tsx) and preview CLIs; under Plug'n'Play, a package also declares each tool its own scripts run.
- **Pin what changes output.** A dependency whose version changes rendered output (mermaid-cli,
  marp-cli) is pinned exactly. After a lockfile change that moves it or a library it loads,
  re-render and recheck.
- **A package's `src/` is scoped by layer**, per [§ Layers](#layers). Beside its entry files an app
  holds only `cli/` (the entry layer: `commands/`, `interactive/`), `config/`, `core/` (domain code,
  one folder per concept), and `base/` (what several concepts build on); a React web app holds
  `app/` and `skeleton/` in place of `cli/` (`react-architecture` § Web app); an Electron app holds
  one folder per process, and its main holds `shell/` in place of `cli/` (`electron-architecture` §
  Layout); a lib holds `config/`, `core/`, and `base/` beside its `index.ts`; the checks fail on
  anything else. Folders that share a prefix nest under it (`cli/commands/`, never `cli-commands/`);
  a hyphen only names one concept (`capture-builder/`). A `core/` of more than about eight concepts
  groups them into sub-scopes by stage, beside `composer/`: report-builder's `core/input/`,
  `core/output/`, `core/quality/`.
- **A role suffix names what a module is, from a closed set**, after the kebab-case stem
  `code-standards` § Names gives every file. `<name>.run.ts` is an entry Node runs, and only it
  reads argv and the working folder and sets the exit code, handing the first two down; nothing
  imports it. The environment and the streams have their own owners: the env lib reads
  `process.env`, a server log lib writes stdout and stderr, and an adapter reads stdin.
  `<name>.adapter.ts` imports a process or native library; `<name>.service.ts` holds a Service class
  (in its lib's `core/`) or the package's one instance of one (`config/env.service.ts`,
  `config/paths.service.ts`); `<name>.command.ts` is one command interface implementation and is all
  `cli/commands/` holds; `<name>.config.ts` holds configuration values in `config/`
  (`runtime.config.ts`); `<name>.error.ts` holds one typed error class, `<Name>Error`
  (`env.error.ts` holds `EnvError`, `cli-usage.error.ts` holds `CliUsageError`). The barrel key
  keeps the role except for an adapter's (`envService`, `buildCommand`, `runtimeConfig`, `EnvError`,
  but `archiveBundleSource`); `<name>.test.ts` and `types.ts` complete the set, and the checks fail
  on any other suffix or a misplaced one.
- **A type lives with its source.** A module declares the types it defines in its own
  `declare module` block, in its folder's namespace: a class's `INSTANCE`, a function's options and
  result, a command's report, a config's shape. A folder's `types.ts` holds only the vocabulary no
  single module defines: the role interfaces its adapters implement, with the types their signatures
  use, and the values several concepts pass between them. A `types.ts` left empty is deleted.
- **A module with no runtime value is `types.ts`.** It holds only its folder's `declare module`
  block (`core/quality/verify/types.ts`); the checks fail on any other module without a default
  export.
- **Utils sit at the level of what they know**, one topic per file, stateless, no classes.
  `base/utils/` takes functions that import nothing from `core/`: unit conversions, clock and stamp
  formatting, hashing, guards, math, and tokenizers over plain values (argv to a flag map). A
  function over one concept's data goes in that concept's `utils/`
  (`core/catalog/utils/catalog-entries.ts`). A class module holds its class and constants and no
  free functions: a helper that needs no state is a util, and one that needs the instance's state is
  a `#private` method. A module whose functions are the concept's own job, such as the deck parser,
  stays a concept module named for its role. A util two packages need moves to a lib.
- **Folders name concepts** (`deck/`, `layout/`, `verify/`), never build output. `build/` and
  `dist/` collide with ignore patterns: an unanchored `build/` hides every folder of that name from
  git and lint. Composition lives in `core/composer/`.
- **In this layout, an app runs as its root script**: `pnpm app:<app> <command>`, or
  `npm run app:<app> -- <command>`, since npm passes arguments on only after `--`. The script is
  named `app:<app>` or `app:<app>:<variant>`; the checks check this. For example,
  `"app:<app>": "src/apps/<app>/bin/run.sh cli"`, and `"app:<app>:interactive"` with
  `cli-interactive`. `bin/run.sh` is committed in each package and says how its entries run
  (`exec node --import tsx src/<entry>.run.ts`); a TypeScript entry carries no shebang. Every copy
  holds the same bytes, which the checks enforce, so a change to one is made to all. The launch
  depends on no install-time link: no `bin` field, nothing in `node_modules/.bin`, so a clone runs
  the same commands as this checkout once its dependencies are installed. It passes argv, the exit
  code, and both output channels through unchanged. Relative argv paths resolve against the repo
  root, where the package manager runs root scripts, wherever the command is typed.
- **A package owns the scripts over its own folder; the root only fans them out.** A root script
  reaches a package only through its `bin/run.sh`, never into its files. It runs `typecheck`,
  `test`, and `build:clear` (in parallel when packages build) through the manager's run over every
  workspace package, such as `pnpm -r` or `npm run <script> --workspaces`, never by globbing package
  folders. A package that builds names its output in its own `build:clear`. An app is not run
  through a per-package run (`pnpm --filter`, `npm run --workspace`, `yarn workspace`): it runs in
  the package folder, breaking relative argv paths, and pnpm's filtered run is recursive, so it also
  turns every failing exit into `1` (losing the CLI's `2`) and adds an error box on stderr.

### Environment tsconfigs

Each package's `tsconfig.json` extends one environment base: `universal` (the ES library only),
`server` (adds Node types), or `client` (adds the DOM). A package that runs in both places stays
`universal`, so a stray `process` or `document` fails typecheck; its suites typecheck through a
project of their own, per `code-unit-tests-architecture` § Typecheck. The root `typecheck` script
checks the root and every package.

## Packages, namespaces, barrels

A package exposes two names and nothing else:

- **Runtime barrel** — one UPPERCASE object in the package's `index.ts` (`ZIP`) that maps each
  module by name, with no spreads. A class module default-exports the class, keyed by it
  (`ZIP.ZipArchiveRW`); a module of one ready instance or constant exports that value, keyed by it
  (`ZIP.zipExporter`, `ZIP.toolPath`). Any other module — functions, with or without constants —
  default-exports an object of them, even of one, keyed by module name
  (`RB.core.input.deck.noteTimingParser.noteSeconds`, `ZIP.xmlText.escapeXml`): the key names the
  file, and a second function joins without moving a call site. The checks fail on a
  default-exported function. No class or function is exported by name. Keys in a barrel and in a
  default-export object run in three groups, each alphabetical: PascalCase classes, camelCase
  functions, instances, and folders, then UPPER_SNAKE constants
  (`{ ShapeReader, parseShape, MAX_SIZE }`); the checks check the order.
- **A barrel ends in `as const`**, so every key, nested folders included, is read-only to the type
  checker and nothing can swap a module out of it. It is never `Object.freeze`d: no code writes to a
  barrel at run time, the callers are typechecked, and a freeze stops at the top level while the
  classes and function objects it hands out stay open.
- **PascalCase constructs, camelCase is ready.** A module that exports a class is keyed by the class
  (`RB.verify.PdfFontReader`); one that exports a ready instance is keyed camelCase by it
  (`ZIP.zipExporter.convert`). A class that would hold only static members is exported as one
  instance instead, its public members delegating to private statics (`ZIP.zipTool.isAvailable`).
  The key spells the kebab-case file stem in camelCase, with a capital first letter for a class
  (`work-dir-rw.ts` is `RB.base.WorkDirRW`), and the checks fail on a mismatch. An app keeps its
  barrel private in `app.ts`, nested exactly like its folders: one camelCase key per folder from
  `src/` (`RB.cli.interactive.InteractiveSession`, `RB.core.output.render.RendererChain`,
  `RB.base.utils.timeFormatter.formatClock`), so a key says where the code lives and which layer it
  belongs to. Its `index.ts` holds only the type root. A lib's barrel is public, so it stays flat
  (`LOG.Logger`, never `LOG.core.logger.Logger`): a lib reorganizes its folders without moving a
  call site.
- **Type root** — an empty PascalCase namespace in `index.ts` (`export namespace Zip {}`). Each
  module adds its types with `declare module "<package>" { namespace Zip.Feature { … } }`; a class's
  type is `Zip.ZipArchiveRW.INSTANCE`, declared as
  `namespace ZipArchiveRW { type INSTANCE = ZipArchiveRW; }`. An app's namespaces follow the same
  folder path in PascalCase (`Rb.Core.Input.Deck`, `Rb.Cli.Interactive`, `Rb.Core.Composer`). A
  lib's type root is public like its barrel, so it never names a folder: a type sits at the root
  (`Log.Sink`) or under its module's name (`Cli.ProcessIo.IoFlags`), never `Cli.Core.Io`, and a move
  inside the lib changes no consumer. Consumers write `import { ZIP, type Zip } from "<package>"`,
  and the inline `type` erases the root. A module that only declares types, with no other import or
  export, is a script, where `declare module` declares a new module instead of adding to the root:
  it ends with `export {};`. A namespace member exists only in a program that contains its declaring
  file, so each tsconfig includes the folders that declare what it reads.
- **Imports** — another package only through its barrel, never a deep path. A package reaches its
  own modules through its `#<folder>/*` alias (`#zip/zip-archive-rw.adapter.ts`, `#zip/index.ts`),
  never by its own package name, and never by `./` or `../`. Import the `.ts` file, not NodeNext's
  `.js` name. The alias needs a name after `#`: Node 22 rejects `#/…`.
- **Module scope never reads the barrel.** A module and its barrel import each other, so a top-level
  read (a constant, a static field, an `extends`) runs before the barrel exists and throws
  `Cannot access … before initialization`. Read it inside functions and methods; the `barrelLoad`
  test catches a regression.
- **Lint the shape** — named exports only in barrel files, no spreads or renamed keys in a barrel, a
  barrel object without `as const`, no types exported from a barrel, no deep cross-package imports,
  no own-package self-import by name, and `consistent-type-imports` with inline type imports.

## Inside an app

The entry, domain, and adapter layers of `code-standards` § Module organisation take this shape:

- **Entry** — `cli.run.ts` lists the commands, runs the CLI lib's runner on them, and sets
  `process.exitCode` from its result, never `process.exit()`, which can cut off output still
  buffered for a pipe. A command parses and validates its flags, wires the modules, writes, and
  returns the exit code. It gets two channels in `run(commandLine, io)`: results go verbatim to
  `io.output` (stdout), diagnostics to `io.logger`, a logger already scoped `<app> <command>`
  (stderr). Never `console` or `process.stdout`; lint bans both.
- **Domain** — returns values, reports, warnings, and expected outcomes for the command to write,
  and throws typed errors for faults (`code-standards` § Outcomes and faults). The CLI lib's
  `CliUsageError` marks bad flags, and the runner prints the command's usage after it. A class that
  must log mid-run takes the log lib's logger interface in its constructor, never a module-level
  logger, so tests pass the log lib's silent logger or a memory sink.
- **Composition root** — one class per pipeline constructs the concrete adapters and strategies and
  passes them down: `DeckBuilder` builds the `ImageCatalog` with its loaders and the
  `RendererChain`. Below it, collaborators arrive through constructors typed as interfaces. A
  process that stays up builds every part once in one root module:
  - Each part is a constant named after its class in UPPER_SNAKE (`UPLOAD_QUEUE_SERVICE`), parts of
    one kind are one object keyed by name, and every constructor gets its deps object in the
    repository's dependency order (`code-standards` § Encapsulation).
  - A part builds its own wiring. The root writes a closure or an adapter inline only when it needs
    several of the root's own values: `new ApiClient({ config, versionHeader })`, not a fetch
    wrapper written at the root.
  - The root passes inputs, never a state it assembled for a part: a store derives its starting
    state from the config and files it is given.
- **Use case** — when two entries run one workflow (a command and the interactive menu), the
  workflow is one class in `core/composer/` (`RB.core.composer.IngestUseCase`): the entries gather
  input, call it, and show the result, and neither wires the pipeline itself.
- **Lifecycle** — in a process that stays up (a server, a daemon, a watcher, an extension, a desktop
  app), each part that holds a resource, a timer, or a subscription plays one `Startable` role,
  `start()` and `dispose()`. Building a part does nothing: it touches the host, opens, or subscribes
  only in `start()`. One lifecycle class starts the parts in the composition root's order and, on
  shutdown, disposes the started ones in reverse. The part that takes requests stops first, so
  nothing answers while the rest goes down, and an error in one `dispose()` is logged while the
  others still run.

### CLI contract

- The documented entry point runs a command and can list commands, for example
  `pnpm app:<app> <command>` or `pnpm app:<app>`. An unknown command or bad flag prints usage.
- Flags are `--flag value` or `--flag=value`; a bare flag reads as `"true"`.
- Exit `0` when done, `1` on bad input or a failed step, `2` for findings the caller must act on
  (`verify`).
- stdout carries results only, so it pipes; logs, errors, and the usage a bad command or flag prints
  go to stderr, while `--help` asked for is a result. Every app takes the log flags the runner
  reads: at least `--log-level` and `--log-format`, each over its `LOG_*` variable, the flag
  winning. The server log lib documents the rest it offers, such as `--silent`, a destination, or
  colour.
- Outputs go only to paths named on argv, and a command never silently replaces a person's work on
  an output: report-builder stops when the deck changed since its build, until `--absorbed`.
- A command that writes to a live system (a database, a cloud account, a deployed app, a vendor API)
  also follows `code-ops-commands`.

### Inputs and expensive steps

- **Validate input files at the boundary.** A JSON input is parsed as `unknown` and checked into its
  type, with one error naming every missing or mistyped field (`parseProfile`). Never cast a parsed
  file to its type.
- **Skip unchanged work by content hash.** An expensive step records a sha256 over everything that
  changes its output (tool version, options, source) and reruns only on a mismatch or a missing
  output; `--force` overrides (`diagrams`).
- **Read the environment through `env.service.ts`.** A package that reads a variable declares it in
  its own `env.service.ts` (`src/config/`): a typed declaration of every variable it reads (a zod
  schema, or the env lib's own field readers), each with its type, whether it may be unset or has a
  default, and a one-line comment, default-exported as one instance of the env lib's `EnvService`
  (`RB.config.envService`). Code reads `envService.values` inside functions, never at module scope,
  so a bad value fails inside the command; a suite passes `envService.read(source)`. A package that
  starts a child process builds the child's environment through the env service, never from
  `process.env`. The env lib is the only reader of `process.env`, and ESLint fails it anywhere else.
- **A browser app with deployment settings reads them once, at bootstrap.** The server sends them
  with the page (an inline JSON element or a settings request), and `src/config/` parses them by a
  schema into readonly groups; a missing or bad value fails before the app or any service that reads
  them starts. Build-time constants carry only what the build knows (version, build mode), so one
  bundle serves every deployment, and nothing secret reaches the browser.
- **Name paths in `paths.service.ts`, never climb to them.** A package that reads its own files or
  the repo root declares them in its `paths.service.ts` (`src/config/`): one instance of the paths
  lib's `PathsService` over `import.meta.url`, the marker file that finds its root, and a map of
  names relative to that root (`RB.config.pathsService.getPath("prompts")`). Code reads it inside
  functions. ESLint fails a `..` segment in a string passed to `path.*` and any
  `import.meta.dirname`; a skill script, which cannot import `src/`, roots on the nearest folder
  above `import.meta.url` that holds its `SKILL.md`.
- **Parse outside data tolerantly.** Data the package observes rather than owns — a server's
  response, a record another tool keeps, a file a released version wrote — is parsed in its adapter
  by a schema tagged `@external` and mapped there to a domain type. One list item in an unexpected
  shape is skipped and logged, a field that may arrive malformed takes a default
  (`.catch(fallback)`), and keys the parser does not know are reported by name: one bad entry never
  fails the list. Input the user hands over stays strict, per the first bullet.
- **A secret stops at its parser.** Code that reads a credential record parses it into a summary
  type with no field that could hold the secret (`hasPassword: boolean`, a key id cut to its first
  and last four characters), so nothing downstream can print one; the secret itself travels only
  from the env service or the secret store to the client that sends it. The log lib blanks fields
  whose key names a secret (`token`, `secret`, `password`, `cookie`, `authorization`, `api-key`)
  before it writes, and variables that work only together (a key id and its secret) are checked
  both-or-neither by a refinement in the env schema.

## Contracts between processes

Code on two sides of a process boundary — a worker, a window and the process that hosts it, an
extension and its page, the two ends of a socket, a client and the server it ships with — talks
through one contract module.

- **One schema per message, types inferred.** The contract declares each message once, as a schema,
  grouped by direction: requests that get an answer, notices that get none, and pushes from the
  other side. Every message type is inferred from its schema (`z.infer`); nothing restates a shape.
- **Transport names stay inside the contract.** Channel, topic, and route strings live in one module
  that only the contract and the transport adapters import. Everyone else calls by typed key
  (`router.handle("download", …)`, `bridge.invoke("download", request)`), and lint bans the raw
  transport (`postMessage`, the bus object, the channel module) outside those files.
- **The receiver checks, the sender types.** The side that runs a request checks who sent it
  (origin, frame, peer) and parses the payload against its schema, refusing and logging either
  failure. What the trusted side sends is only typed, so a sandboxed side imports the contract's
  types, never its schemas, and does not bundle the schema library.
- **A request always answers.** It resolves to the never-rejecting result of `code-standards` §
  Outcomes and faults, and the asking side gives up after a timeout, so a dead peer cannot stall it.
- **Generic access keeps its types.** The contract object is annotated as a mapped type over its own
  keys (`{ readonly [K in RequestKey]: { request: z.ZodType<Request<K>>; … } }`), so `contract[key]`
  with a generic `key` keeps that key's types without a cast.
- **Versions travel with requests.** A client that does not deploy with its server (an installed
  app, a CLI, an extension) names its version on every request; below the server's minimum the
  server answers HTTP 426 and the client shows the way to update. A server change is additive, or it
  raises that minimum in the same deploy.
- The inferred types have type-level assertions (`code-unit-tests-architecture` § Type-level tests).

## State with one owner

When several views or processes show the same state — a server and its clients, a background process
and its views, a worker and its pages — one side owns it and the others hold copies. The state
library is the repository's own (a reducer store, signals, observables); these rules hold for any of
them. Views in one process that read one model share it and need none of the copy rules below.

- **One owner changes the state, and data flows one way.** Only the owner applies a change. A view
  reads its copy and never writes it; it asks the owner through one typed object of named requests
  (`client.actions.sendSettingsEdit(edit)`), each a call that does not wait and whose failure the
  owner logs. A view awaits a call only for an answer it shows.
- **A control shows what the owner holds.** No view keeps its own optimistic copy of an owned value,
  so a change appears once the owner has made it, whichever view, menu, or command asked. Text the
  person is still typing is a draft local to the view until it is applied.
- **A copy is a snapshot plus numbered changes.** The owner sends each changed part with a version
  that only rises. A view subscribes before it reads the snapshot, so a change sent meanwhile is not
  lost, replaces a part only with a newer one, and renders once its copy holds the snapshot. A part
  only the owner needs is never sent.
- **Real-time data skips the state.** What changes many times a second (progress, a live position)
  would cost a reducer, an equality check, the reactions, and a copy to every view on each change:
  the part that produces it pushes it directly, and the one view that shows it listens and writes it
  to the screen itself.
- **An unchanged value keeps its identity.** A part that takes a whole new value keeps the old one
  when the two are equal, so reactions and copies see nothing to act on.
- **Reactions read through selectors.** Code that reacts to a change reads state only through the
  selectors views use, so a part's shape is read in one place. It does no I/O while it registers
  (that waits for `start()`, [§ Inside an app](#inside-an-app)), and when requests overlap, the
  latest wins and the older ones are cancelled ([§ Cancellable work](#cancellable-work)).
- **A request splits into what needs nothing and what needs the outside world.** The state change
  applies what needs nothing more; a reaction runs what needs I/O (a dialog, the OS, the network)
  and records its result as a new change. Both list every request kind (`code-standards` § Module
  organisation).
- **The state starts from what is known.** Each part starts from what the owner reads at launch
  (config, saved files, the OS), never a placeholder default shown as real. What the outside world
  changes without telling the owner (an OS setting, who is signed in) is read again on an event that
  can follow it, such as a view gaining focus.

## State that outlives a run

- **Saved state goes through one store.** A JSON file of state is read and written by one store
  class. A write goes to a temporary sibling and is renamed over the file, so a crash leaves the old
  file or the new one. A read is checked by the file's schema, and a missing, unparseable, or
  wrong-shaped file gives the default with a logged warning. A key a released version wrote keeps
  its name and meaning; a change of meaning is a new key or a new format version.
- **Long work is a saved state machine.** Work that outlives one call (an upload, a sync, a batch)
  is a queue of jobs, each in one of a closed set of states (`queued`, `waitingNetwork`, `running`,
  `failed`), saved after every confirmed step. A restart resumes each job from its last confirmed
  step; a lost network parks jobs in their waiting state and its return wakes them; how many steps
  run at once is a named constant; a stop lets running workers finish their current step.
- **One at a time where overlap breaks.** An operation two callers must not run at once — a token
  refresh, a migration, a rebuild — keeps its promise in a field while it runs, and later callers
  join it: `this.#refreshing ??= this.#refresh().finally(() => { this.#refreshing = null; })`. A
  credential the provider rotates on use is saved before it is used, since the old one is already
  gone.
- **A file has one writer.** Only one part writes a saved file; the others read it at launch or ask
  that part. A part that reports a change it made itself settles its own state and file first and
  reports last, so the reaction to its report finds nothing left to change. A step that saves a
  choice before work that can fail (sign out, then restart) finishes in `finally`, so what is saved
  and what runs cannot drift apart.

## Cancellable work

Work that a newer request, a closed view, or a shutdown can make useless stops when that happens,
and releases what it holds.

- **The owner holds the handle.** The part that starts the work keeps its cancel handle (an
  `AbortController`, a task) in a field, cancels it when the work is superseded or the part is
  disposed, and awaits the cleanup before it starts the next run or reports itself stopped.
- **A request flow takes an `AbortSignal`.** A fetch, a read, or a chain of them passes the caller's
  signal down to every call: the client stops waiting and aborts the transport, though work the
  server has already started may still finish. This covers most work, with plain `async` and
  `await`.
- **A stepwise flow that acquires resources runs as a scoped task.** When a flow opens or starts
  things one step at a time (a media pipeline, a device, a worker, child tasks) and a newer request
  can supersede it midway, an `async` chain stops only where it checks the signal, and its cleanup
  is whatever each step remembered to write. Such a flow is a generator function under a
  structured-concurrency runtime (effection, or the repository's own): each `yield` is a point where
  a halt stops it, its `finally` releases what it acquired, and child tasks end with it. The task
  bridges its halt to an `AbortSignal` for the requests it makes, and an acquisition that cannot be
  aborted releases its result when it arrives after the halt. A generator is used only for this;
  everywhere else stays `async`.
- **The latest attempt wins.** A part that runs one attempt at a time takes a new, rising attempt
  id, then halts the previous attempt and awaits its cleanup. It checks the id again before it
  starts work and before it commits a result, and drops any result whose id is no longer current.
- **A cancel is an outcome.** A cancelled run returns a `cancelled` member of its outcome union
  (`code-standards` § Outcomes and faults), never an error matched by its message, and a caller that
  cancelled it ignores it.

## Work off the main thread

A worker runs code on a thread of its own: a browser's dedicated worker, an audio worklet, a Node
`worker_threads` worker. It talks to its owner through
[§ Contracts between processes](#contracts-between-processes); these rules add what a thread
changes. Code: [references/workers.md](references/workers.md).

- **A worker is for work that blocks the thread or must keep time where the thread cannot.** CPU
  work a trace shows as a long task on the thread that serves the person (parsing a large file,
  encoding, hashing, image processing, searching a large index) moves to a worker; I/O stays, since
  awaiting it blocks nothing. Audio processed block by block runs in an audio worklet, which the
  audio thread calls for every block and which lives with its audio graph: its owner disconnects the
  node and closes the context, and the rules on starting and ending a worker below do not apply.
- **The owner keeps the state; the worker computes.** The worker takes inputs and returns results,
  keeping at most a cache of its own inputs, and the owner applies each result
  ([§ State with one owner](#state-with-one-owner)), so a restarted worker loses nothing. The
  computation is a plain function the worker file calls, so a suite tests it without a worker.
- **A worker's own channel is typed, not checked.** A dedicated worker and its creator come from one
  build, so their messages are the trusted side's typed messages of § Contracts between processes.
  Data the worker reads from outside, and a port handed to other code, are checked as that section
  says.
- **Large data changes hands; it is not copied.** A message is a structured clone of plain data. An
  `ArrayBuffer`, an `ImageBitmap`, or a `MessagePort` in the transfer list moves to the receiver and
  leaves the sender without it. A typed array moves its whole buffer, so the sender passes one that
  owns all of a non-shared buffer (`Float32Array<ArrayBuffer>`), or a copy. Input that several
  requests share is sent once and named by the requests after it.
- **One reusable worker per kind of work, started on first use, ended with its owner.** A worker
  costs a fetch and an evaluation to start, so its owner creates it on the first request, reuses it,
  and terminates it on dispose; the owner takes the creating function as a dependency, which keeps
  the bundler's `new Worker(new URL(…))` literal in one place and gives a suite a fake. A pool comes
  only after a measurement shows one worker is the bottleneck; its size starts from the machine's
  estimate (`navigator.hardwareConcurrency`, `os.availableParallelism()`) and grows only while a
  benchmark shows a gain.
- **Every request ends in an outcome.** A request takes the caller's signal and a deadline
  ([§ Cancellable work](#cancellable-work)). A failure to create the worker or send the message, a
  message that cannot be read (`messageerror`), a crash (`error`, or Node's `exit`), and a missed
  deadline each answer the pending requests as failed. The owner ignores a reply from a worker it
  has already replaced: a browser drops replies still queued from a terminated worker, but Node's
  `terminate()` finishes later and can still deliver one.
- **Cancelling a computation ends it.** A computation that runs in chunks yields a task between them
  (`setTimeout`, `scheduler.yield()`), so a cancel message can arrive, and checks for it; one that
  cannot is stopped by terminating its worker, and the next request starts a new one.
- **A cadence that must hold in a hidden tab takes its wakeups from a worker.** A hidden page gets
  no animation frames, and its own timers are throttled: to once a second, and in Chromium to once a
  minute for chained timers after five minutes hidden, on a page that is silent and has no WebRTC
  connection. A loop that must keep time while hidden (a recording's frame pump, a countdown, a
  session heartbeat) runs on animation frames while the page is visible and on the ticks of one
  shared timer worker while it is hidden. The worker only wakes the page: the loop's step still runs
  on the page's thread, and it works out what is due from a clock, since ticks arrive late and in
  bursts. No browser promises a worker's cadence, so a test with the tab hidden for more than five
  minutes checks it on every target browser. A frozen page's workers freeze with it, and a worker
  does not keep a tab from being frozen or discarded, so work that must survive that saves its
  progress as it goes ([§ State that outlives a run](#state-that-outlives-a-run)). A desktop window
  that must keep time turns its host's throttling off instead (`electron-architecture` § Windows);
  the page then always reads as visible, so the host's own window state tells it when no one is
  looking.
- **Work only a viewer needs pauses while hidden.** Polling that refreshes what someone is looking
  at (a list, comments, notifications) stops while the page is hidden and refreshes once on return.

## Regression gates

- **Unit tests** follow `code-unit-tests-architecture`: what gets a suite, `test/` mirroring `src/`,
  fakes for adapters, and the `barrelLoad` guard. This section covers the gates above them.
- **Output is deterministic**, so bytes can be compared: ids follow call order (shape ids follow
  drawing order), written JSON has sorted keys, and volatile ids are masked when comparing (`w14`
  paragraph ids).
- **A move or refactor is gated on byte equality.** Before the first change, capture a baseline in a
  scratch folder outside the tree: a sha256 per package part, since zip container bytes vary between
  runs, plus the stdout of every command. Re-capture after each phase and diff; only differences the
  plan names in advance may appear.
- **A rename is checked past the type system.** Keys in untyped literals, spreads, JSON written or
  read, CLI flags, and caches rename silently; give such literals their type, keep external keys
  behind an `@external` type, and bump a cache's format version. A language-service rename of
  `#name` can drop the `#`: grep for it after.
- **A guard is proven by breaking it.** A new lint rule, type check, or repository check lands with
  a violation planted to see it fire, removed before the commit, and a boundary added to the code
  gets its rule in the same change. `@ts-expect-error` hides every error on its line, a missing
  import included, so prove such a line by making the misuse valid and seeing "Unused
  '@ts-expect-error' directive".
- **A lint rule explains itself.** A boundary between layers or processes is a lint rule, not a
  review note. Every restriction's message says what to do instead ("Import through the package's
  `#<folder>/*` alias, never a relative path"), and a comment above the rule says why it exists. An
  override replaces a rule's options rather than merging them, so a pattern every folder needs is
  repeated in each override, with a comment saying so.
- Run the repository's typecheck, lint, and package anatomy checks.

## README contract

A README is written for people: someone who has not seen the package learns what it is for, how its
parts fit, and how it is checked, in plain words. A diagram helps them more than a list does when
the parts depend on each other or data moves through steps: add one simple Mermaid diagram, a few
nodes, of the dependencies or the flow; a package a table explains needs none. This contract decides
when a README draws; `visual-explain`, where it is installed, says how to write and draw.

- **Lib** — `# @<scope>/lib-<folder>`, then one paragraph on what it gives the apps; a table of
  barrel keys and what each holds; a short usage snippet; who uses it, what it depends on, and
  platform limits.
- **App** — `# <folder>`, then what it builds and what comes from argv; `## Commands` with the
  command table and exit codes; sections for the input contract and engine behaviour; `## Structure`
  with the barrel, the folder table, and the libs it shares; `## Engine notes` for the gotchas;
  `## Tests`, with what the suites cover and the real runs that check the adapters.
- **Skill script package** — `# <package name>`, then one paragraph on what the scripts do and a
  link to `../SKILL.md` for how they run (commands, flags, and exit codes stay there);
  `## Structure` with the entries, the barrel, the folder table, and the libs it uses; `## Tests`,
  with what the suites cover and the real runs that check the adapters.
- An app that runs as several processes, or whose state moves between parts, shows both in
  `## Structure` as Mermaid diagrams: one of its parts and what each depends on, one of how data
  flows from a request to the screen.

## Adding a package

1. Follow the existing workspace's package and toolchain conventions. In the default layout, create
   `src/apps/<folder>/` or `src/libs/<folder>/` with the files in
   [§ Package anatomy](#package-anatomy) and run the package manager's install to link it. In a
   single-package repository, a second package changes the repository's shape: ask first
   ([§ Repository shapes](#repository-shapes)).
2. In the lint config, add a per-package override for `src/<apps|libs>/<folder>/**/*.ts` whose
   `@typescript-eslint/no-restricted-imports` bans its own name (`@<scope>/lib-<folder>` or
   `@<scope>/app-<folder>`); an app's also bans every other app package. Repeat the `src/**/*.ts`
   pattern group in it: an override replaces a rule's options rather than merging them. Name each
   adapter `<name>.adapter.ts`.
3. Follow the project's app launcher convention. In the default layout, copy an app's `bin/run.sh`
   with its executable bit and add the `app:<folder>` root script. Add the package's test command
   when it has tests.
4. Add the package's row and graph edges to the repository's architecture doc.
5. Link the README from the owning skill and name the real entry point in its router row, if any.
6. Run the repository's format, lint, typecheck, test, and package anatomy checks.

## Review checklist

- The code sits at the right level: workflow in the skill, the engine in an app, shared code in a
  lib that has two consumers.
- No import crosses a boundary, and no process or native import sits outside a named adapter.
- Each module sits in one layer and imports only its own or lower ones; a module mixing layers is
  split, and contracts sit below their implementations, in a package and between packages.
- Each type sits in the module that defines it, and `types.ts` holds only shared contracts; a class
  module holds no free functions, its stateless helpers living in its concept's `utils/`.
- Only a `*.run.ts` entry reads argv and the working folder, and it sets `process.exitCode`; the
  environment and the streams go through their libs or adapters.
- Every specific arrives on argv; nothing defaults to one template or profile.
- Commands alone write, results to `io.output` and diagnostics to `io.logger`; domain code returns
  warnings, takes an injected logger, and throws typed errors.
- Input files are validated, not cast. Outside data is parsed by `@external` schemas in its adapter
  and tolerated item by item; no secret value reaches a summary type or a log line.
- The host's API appears only in adapters and the composition root; errors are translated by the
  layer that understands them.
- Messages between processes come from one contract: each schema once, types inferred, the receiver
  checking sender and payload, every request answering within a timeout.
- Saved state goes through a store with atomic writes and schema-checked reads, each file with one
  writer; long work resumes from its last confirmed step; parts of a long-running process are
  `Startable`, built once in one composition root that passes inputs, not assembled state.
- Shared state has one owner: views read copies built from a snapshot and numbered changes, ask
  through named requests, and show what the owner holds; real-time data bypasses the state.
- Work that can be superseded is cancelled by its owner: requests take a signal, stepwise resource
  flows run as scoped tasks that release in `finally`, stale attempts are dropped, and a cancel is
  an outcome.
- A worker holds CPU work or a hidden-tab cadence, never state: it starts on first use, moves large
  buffers by transfer, answers every request with an outcome, ends on cancel or dispose, and its
  cadence was checked with the tab hidden.
- Every lint restriction names its fix, and a boundary between layers is a rule.
- Each new guard was seen to fail on a planted violation.
- In a package: one default export per module (the value itself when there is one), types in the
  module's `declare module` block, nothing read from the barrel at module scope, and the barrel
  `as const`.
- A shell script past a few commands in a row is a script package: one plan module lists its steps,
  and one runner prints each as it runs.
- A move or refactor shows its baseline diff.
- A new package passes the checks and appears in the repository's architecture doc.
- Its tests pass the `code-unit-tests-architecture` § Review checklist.
