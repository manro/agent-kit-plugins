---
name: code-unit-tests-architecture
description: >-
  Unit-test standard for TypeScript packages: node:test suites in `test/` mirroring `src/`, typed
  fakes instead of mocks, temp-dir fixtures, and behaviour-sentence names. Use when writing, moving,
  or reviewing tests, or deciding how to test code that runs a process.
---

# Code Unit Tests Architecture

How the unit tests of TypeScript tooling under `src/` are laid out and written. The consuming
repository names its scope, its libs, and its checks in its own wrapper skill or AGENTS.md. Examples
use `report-builder` (`RB` / `Rb`) and `@<scope>/lib-zip` (`ZIP` / `Zip`). `code-architecture`
decides where code lives and how packages connect, and owns the `code-architecture` § Regression
gates for moves and refactors; this skill decides how each module is tested.

## When to use

**MUST** apply when adding or changing a suite under `src/apps/*/test/` or `src/libs/*/test/`;
adding a module with logic a suite should cover; moving, renaming, or splitting a module, since its
suite moves with it; and reviewing any change under `src/` that adds logic or touches a test.

## Scope

- `src/apps/*/test/**`, `src/libs/*/test/**`
- Each package's `test` script and the root `test` script

## What gets a suite

| Code                                                                             | Checked by                                                                                      |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Logic with branches: parsers, validation, layout, matching, filters, formatting  | A suite of its own                                                                              |
| A wrapper over a process or native tool (`FfmpegFrameSource`, `MlxVlmDescriber`) | A suite that hands it a fake runner and checks the arguments it builds and the output it parses |
| The process call inside an adapter, a command's wiring, a composition root       | A real run of the command, named in the app README's `## Tests`                                 |
| Load order of the barrel                                                         | `test/barrel-load.test.ts`, in every app                                                        |

- **No process, network, browser, or model in a suite.** A suite runs in milliseconds on any machine
  with Node. What needs ffmpeg, Chrome, Word, or model weights is checked by a real run: `doctor`,
  `run --url` on a public share, the interactive CLI driven through a pty.
- **Design for the fake.** A module that would need a process to test takes it behind an interface
  in its constructor (`code-architecture` § Dependency direction). A step that reads the
  environment, the terminal, or the clock takes them as parameters
  (`logOptions.parse({ env, flags, ttys })`), so a suite passes fixed values; a suite builds the
  environment with the package's `envService.read({ … })`, never by setting `process.env`. An
  interactive flow takes its prompter and its wait indicator as ports, and a suite drives it with a
  scripted prompter that answers from a list and records what each prompt offered.

## Layout

- **`test/` mirrors `src/`, one suite per module.** `src/core/vision/screen-step-reader.ts` is
  tested by `test/core/vision/screen-step-reader.test.ts`; a suffixed module's suite drops the
  suffix (`archive-bundle-source.adapter.ts` → `archive-bundle-source.test.ts`, `env.service.ts` →
  `env.test.ts`). The checks fail on a suite with no module twin.
- **A suite tests one module.** When tests of a second module collect in it, split it along the
  modules, one suite beside each.
- **A suite moves with its module**, in the same change.
- **Fixtures are built in code.** A suite builds its inputs inline, or in a local function that
  returns the typed value (`fixture(): Rb.Config.RuntimeConfig`). A file the module must read goes
  under `mkdtempSync(path.join(tmpdir(), "<app>-<module>-"))`, never into the repo or `tmp/`.

## Writing a suite

- **node:test and strict assert, flat.** `import { test } from "node:test"` and
  `import assert from "node:assert/strict"`; top-level `test()` calls with no `describe` nesting or
  hooks, so each test builds what it uses. `assert.throws(fn, /text/)` and `assert.rejects` pin the
  error's message, not only that something threw.
- **The name states the behaviour that must hold**, as a sentence: "a usage error is logged and
  followed by the command's usage", never "runCli works" or a function name.
- **Code is reached through the package's own barrel.** An app's suite imports `#<folder>/app.ts`
  (`RB.core.media.ffmpegFrameSource.parseShowinfo`), a lib's `#<folder>/index.ts`, types through the
  type root (`import type { Rb } from "#report-builder/index.ts"`), and another package through
  `@<scope>/lib-<folder>` or `@<scope>/app-<folder>`. Never a deep module path: the suite calls the
  keys callers call, and a module the barrel misses fails. A pure step worth testing is a key on its
  module's default object (`frameReader.composeFrame`), never a test-only export.
- **Fakes are object literals typed by the interface.** `const runner: Rb.Base.Runner = { run }`
  records what it received and answers the way the real collaborator does; the test asserts on both.
  A fake of a role that publishes events is a small class extending the event lib's `EventerBase`.
  No mocking library and no `mock.method` patching of a module.
- **A suite prints nothing.** A class that logs gets the log lib's silent logger, or the log lib's
  memory sink when the test asserts on what was logged; a command gets the log lib's memory output
  for `io.output`.
- **One behaviour per test.** Several asserts are fine when they check that behaviour across inputs.

## The barrelLoad guard

Every app keeps `test/barrel-load.test.ts`. It imports `app.ts`, checks that every group has keys,
and pins the command list. A module that reads the barrel at module scope makes it fail with
`Cannot access … before initialization` (`code-architecture` § Packages, namespaces, barrels), so a
broken import order shows in `pnpm test` before the first real run.

## Type-level tests

A type the code infers — a contract's message types from their schemas, a mapped or conditional type
— gets assertions that fail the typecheck when it drifts. They sit in the module's suite, inside a
`test()`, and compile with the suites:

```ts
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

function assertType<T extends true>(_isTrue: T): void {}

test("each request type is inferred from its schema", () => {
  assertType<IsEqual<App.Ipc.InvokeRequest<"download">, App.Ipc.Download.Request>>(true);
});
```

- **Misuse stays under `@ts-expect-error`** in a function the suite never calls: a wrong handler, a
  wrong payload, an unknown key. Each such line is proven per `code-architecture` § Regression
  gates.
- **Compare a generic API key by key.** TypeScript erases a generic's type parameters when it
  relates the generic signature to overloads, so a whole-object `extends` check lets a changed
  response through. A conditional type over the keys that reduces to the drifted key names it in the
  error.

## Real runs

What a suite cannot reach (the process call inside an adapter, the wiring, the host) is checked by a
script that runs the real program, under `test/smoke/` as a `<flow>.run.ts` entry, run by the
package's `smoke:<flow>` script and never by `test`.

- **It never touches the user's data.** The program runs with a throwaway state folder (an app's
  `--user-data-dir`, a temporary `HOME` or config path) under `mkdtempSync`, removed afterwards.
- **Its outside world is its own.** A dependency the run needs set up its own way is started by the
  script as a local stand-in: a fake identity provider, a local object store, a database in a
  container, the server under test with test settings. A script that needs a dependency to vanish
  puts its own pass-through proxy in front of it and closes the proxy. A script that creates data on
  a shared server runs only against a dev server.
- **It triggers the real path.** A quit is the program's quit call or a signal, not an emitted
  event; what the operating system gates (notifications, URL schemes, signatures) is checked on a
  packaged build.
- **What the scripts share is one support module** — work folders, launching, waiting for a step,
  the stand-ins — never copies.
- The README's `## Tests` lists each script, what it proves, and what it needs.

## Typecheck

Suites typecheck with their package. A `server` package's `tsconfig.json` includes `test/**/*.ts`
beside `src/**/*.ts`. A `universal` lib's suites need Node types its code must not see, so they
typecheck through `test/tsconfig.json`, which extends the server environment base and includes
`../src/**/*.ts`; the package's `typecheck` script runs both projects (the universal log lib).

## Running

- **Each package runs its own suites.** A package with `test/` has the script
  `"test": "node --import tsx --test 'test/**/*.test.ts'"`, which the checks check, and the root
  `pnpm test` is `pnpm -r test`, one prefixed run per package.
- One package: `pnpm --filter @<scope>/app-<folder> test` or
  `pnpm --filter @<scope>/lib-<folder> test`. One suite: `node --import tsx --test <path>.test.ts`;
  one test: add `--test-name-pattern "<words from its name>"`.
- A change is done when the repository's test, typecheck, lint, and package anatomy checks pass.

## Review checklist

- New or changed logic has a suite at the mirrored path; a moved module's suite moved with it.
- Each test name states a behaviour.
- Code comes through the barrel and types through the type root; no deep path.
- No process, network, browser, or model; collaborators are typed fakes, not patched modules.
- Nothing prints; temp files sit in an OS temp dir.
- Inferred types carry type-level assertions, and generic APIs are compared key by key.
- A real-run script uses a throwaway state folder and its own stand-ins, and its README row says
  what it proves.
- The app README's `## Tests` names what the suites cover and the real runs that check the adapters.
