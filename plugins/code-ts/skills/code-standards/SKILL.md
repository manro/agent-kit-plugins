---
name: code-standards
description: >-
  TypeScript structure standard: classes with `#private` state, naming, `(deps, options?)`
  constructors, layout, composition over inheritance, typed events and errors, and GoF patterns. Use
  when writing, refactoring, reviewing, or designing TypeScript or TSX, or choosing a class or a
  function.
---

# Code Standards

Architecture and code organisation are part of every change, not a follow-up. Structure follows the
problem: name the concepts, give each one a home, and let the pattern the problem already has decide
how they connect.

## When to use

**MUST** apply when writing, refactoring, reviewing, or designing TypeScript or TSX code, including
small scripts — the class-or-function table below is what keeps a small script small.

## Scope

- `**/*.ts`, `**/*.tsx`

Lint and the naming checker enforce the mechanical rules; where this skill says the checker fails a
pattern, [§ Run the checker](#run-the-checker) reports it. The repository's `AGENTS.md` or wrapper
skill names its event library, the folders to check, and any local additions. The rules shape new
and changed code; an existing package, module, or export keeps its name, and a rename to fit them is
a change of its own the user asks for (`code-architecture` § Repository shapes).

## Run the checker

After writing or changing TypeScript, and before finishing, run the bundled checker from the
repository root. It loads the repository's own `typescript`, so nothing is installed:

```bash
node <this skill's folder>/scripts/dist/ts-naming-check.run.mjs --plain --include <path> \
  [--include <path> …] \
  [--event-lib <dir>] [--event-base <Name>] [--wiring-dir <dir>] [--project tsconfig.json] \
  [--baseline <file> [--write-baseline]] [--json]
```

- `--include` names each folder or `.ts` file to check (default `src`); the repository's wrapper
  lists them. One run checks one `--project`, so a repository of several TypeScript projects runs it
  once per project.
- `--event-lib` is the event library's folder, where `abstract`, `protected`, and the event base
  class are allowed; `--event-base` names that class (default `EventerBase`).
- `--wiring-dir` is a folder besides `cli/` that may construct adapters, such as a CLI library.
- `--baseline` names a JSON file of accepted findings, each file's messages without their line
  numbers. The run then reports only findings it does not accept, plus each accepted one that no
  longer occurs, so the file only shrinks. `--write-baseline` rewrites it from the current findings.
  A baseline holds code written before a rule; new code never goes into it, and a repository without
  older code runs with none.
- `--plain` keeps the output free of colors and prompts, even when the agent's shell is a terminal;
  always pass it. `--help` lists the flags and their defaults.
- Exit 0 with no findings, 2 with findings (one `<path>: <message>` line each), 1 on bad input or
  when the repository has no `typescript`. Fix every finding, or raise the rule with the user.

## Class or function

Classes are the default for anything that owns state, guards an invariant, or stands in front of an
external system. Pure transforms stay functions.

| Situation                                                            | Unit                                                     |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| Data with invariants, plus the operations that keep them             | Class                                                    |
| Functions that pass the same arguments or a module-level `let` round | Class — the shared argument is its state                 |
| Wraps a file format, process, network API, or OS facility            | Class (Adapter or Facade)                                |
| Two or more interchangeable behaviours                               | Interface plus one class per behaviour (Strategy)        |
| Resource with a lifecycle (open, use, close)                         | Class with an explicit `close()` or `[Symbol.dispose]()` |
| Stateless facility needing no construction arguments                 | One exported instance of its class                       |
| Pure transform: input in, value out, no shared state                 | Function                                                 |
| Predicate, formatter, unit conversion                                | Function                                                 |
| Plain data crossing a boundary                                       | `type`, never a class                                    |
| Linear script with one job and no shared state                       | Functions in one file                                    |

A module of exported functions that all take `(ctx, …)` is a class missing its constructor.

A class of only static members is a module in disguise. Export one instance instead, with its public
members delegating to `#private` statics, so callers hold it like any other object and never see
`static`.

## Encapsulation

An abstraction leaks when callers must know how it works to use it. Prevent that:

- State is `#private` and `readonly` unless it must change. No public fields; the checker fails a
  mutable field without `#`.
- Fields sit in two groups, `readonly` first, then mutable, with one blank line between.
- The public surface speaks the domain: a package object hands out slides, not XML strings; a
  renderer takes a parsed deck, not the parser library's node type.
- Never return an internal mutable collection — return `readonly` views or copies.
- A constructor only assigns fields and calls `super()`, and each field gets what was passed in: a
  parameter, a property of one, a literal, or a `??` default. Construction that reads, parses,
  computes, subscribes, or can fail is a static factory (`static open(path)`, `static parse(text)`)
  that passes the results in; the checker fails any other statement or right-hand side.
- Tell, don't ask: callers ask an object to do work instead of pulling its fields out to do the work
  themselves.
- Collaborators arrive through the constructor, typed as interfaces. No hidden singleton imports, no
  `new` of an external client deep inside domain code: an adapter (`*.adapter.ts`, every class that
  wraps a tool) is built only in a static factory or the CLI layer and injected, and the checker
  fails a `new` of one anywhere else, through an import or a barrel key alike.
- **A constructor takes `(deps, options?)`.** `deps` is one object naming every collaborator and
  setup value, the logger included; `options` is an optional object of values with defaults that
  tests change (a timeout, a poll timing, a clock as `{ getNowMs }`). The call site names what it
  passes, nothing can be swapped silently, and a new collaborator is one more key. Each one lands in
  a `#field` of the same name, so the fields show what the class uses. The logger is never a
  parameter of its own, and never optional: an optional logger is a part that silently logs nothing.
  Two kinds keep their own shape: an error class (`(message, { cause })`) and a holder of one value
  (`new OfflineCache(maxBytes)`).
- **Every dependency has one name and one place.** The same thing is injected under the same name in
  every class (`config`, `logger`, a service as its class name), and every deps type, its class's
  fields, and every call site list the names in one order the repository keeps: configuration first,
  then setup values, stores, outside clients, services, host parts, functions it calls, and the
  logger last, alphabetical within a group. A new kind of dependency takes an existing name or joins
  a group; a repository that lints the order keeps the groups in that rule.
- **A port lists only what its consumer calls.** An interface over a vendor client, a host API, or a
  message bus declares the members this code uses — a request runner takes one `Fetch` signature, a
  router the four methods of the bus it registers on — never the vendor's whole type, so a fake is a
  few lines and a vendor upgrade reaches one adapter. The composition root passes the vendor
  function or object in as that port.
- Vendor SDK, OS, and process types stop at the Adapter. Domain classes never import
  `child_process`, `fs`, or a vendor client directly.

## Members

The name alone tells a reader whether a call asks or acts:

| Member                                                                           | Form                                     | Examples                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------- |
| Query without parameters — returns a value, changes nothing observable           | accessor `get x()`, `get #x()`           | `get xml()`, `get #colors()`                 |
| Query with parameters                                                            | `getX(…)`                                | `getRowHeight(w)`, `getLayout(name)`         |
| Boolean query, never `has…`/`can…`                                               | `get isX()`; with parameters `getIsX(…)` | `get isAvailable()`, `getIsPresent(name)`    |
| Command — changes state, writes, or emits; may return a by-product such as an id | a verb, never a bare noun                | `render(slide)`, `addTable(…)`, `drawBox(…)` |
| Creation                                                                         | its verb                                 | Builder `build()`; static `open`, `parse`    |

- A function converting between units is named `<from>To<to>` (`inchesToEmu`, `ptToEmu`), and
  `to<Target>` only when the input unit is never in doubt; a bare unit noun (`inches(x)`) hides
  which way it converts. A function that renders a value for display is `format<X>`
  (`formatInches`).
- A query may read a file or memoise; it never changes what a caller can observe. An accessor
  recomputes on every read, so a value fixed at construction is a `readonly #field` instead.
- An interface declares a parameterless query as `readonly x: T`; the class satisfies it with a
  field or a `get x()` accessor.
- An implementation that ignores a parameter still declares it, prefixed `_`
  (`getIsAccepting(_kind)`), so it keeps the interface's shape and does not read as a parameterless
  query.
- Private methods, accessors, and fields are ES `#private`, never the TypeScript `private` keyword,
  which vanishes at runtime. The one exception is `private constructor`, which forces callers
  through a static factory; there is no `#constructor`.
- Parameter properties cannot be `#private`, so collaborators are explicit `readonly #fields`
  assigned in the constructor.
- **At most three parameters, and no two neighbours of one primitive type.** A signature that takes
  more, or two neighbouring strings, numbers, or booleans that a caller could swap without a type
  error, takes one options object: `copy({ inputPath, outputPath })`, not `copy(input, output)`. A
  symmetric pair named `a`, `b` stays positional; the checker fails the rest.
- Lint what syntax shows with `no-restricted-syntax`: the `private` keyword, a parameterless `get…`
  or `boolean` method, a `boolean` accessor not named `is…`, a `boolean` method with parameters not
  named `getIs…`, a `get…` method returning `void`. Whether a method is a query is a review call.

## Names

A module's file, its main class or barrel key, and its type namespace carry one name, and that name
says who acts and on what:

- **`<what><Role>`.** A class ends with its implemented interface's last camel-case word
  (`AgendaRenderer implements SlideRenderer`); with several interfaces, one match suffices. Test
  files are exempt. The checker checks this. Otherwise the role is the pattern it plays
  (`LogProgressObserver`, `SlideBuilder`, `RendererChain`), or its job (`deckParser`,
  `templateProfileLoader`, `IngestUseCase`). A bare noun (`WorkDir`, `Ingest`) hides what the unit
  does.
- **The what is specific.** Name the data, format, or tool (`JsonFieldReader`, `PdfFontReader`,
  `MermaidJobPlanner`), not a generic noun — field, item, content, part, view, record, output,
  shape. A name answers "what?": `UploadQueueService`, not `UploadService`. An adapter starts with
  the tool it wraps (`ResvgSvgRasterizer`, `PrismCodeHighlighter`, `OsascriptRunner`); a
  `base/utils/` topic is qualified (`typeGuards`, `timeFormatter`).
- **The name a person would look for.** A file and its class are named for what someone searching
  the tree would type: a noun people already use for the thing wins over a mechanical role
  (`JsonStorage`, not `JsonFileRW`; `PinoLogger`, not `PinoLogWriter`), and its interface is named
  for that role. A file whose name already says what it holds is not renamed to fit a pattern.
- **The role is true.** `Reader` and `Writer` do I/O; a function that returns built text is a
  `Builder` (`captureMarkdownBuilder`), one that turns text into data a `Parser`. A class over one
  store — a folder, an archive, a copy on disk — with no such noun that reads and writes it ends in
  `RW` (`WorkDirRW`, `ZipArchiveRW`); read-only ends in `Reader`, write-only in `Writer`.
- **A layer is named for what it is**, never after the layer below it: a module that syncs orders
  over a socket is `orderSync`, not `orderSocket`; only the transport itself is named for the
  transport.
- **One word for each recurring thing.** A reply from a server or another process is `response`
  (never `answer`, `res`, `reply`); a private helper that assembles a value is `#build…`
  (`#buildUrl`); a helper that joins a path is `get<What>Path(fileName)`. A repository adds its own
  such words to its `AGENTS.md`, and code uses no synonym for them.
- **No borrowed meaning.** A name that already means something else to a reader misleads: a module
  reading screen-share steps is `screenStepReader`, not `screenReader`.
- **Collections say their shape.** A variable, parameter, field, or constant holding a collection,
  and an accessor, method, function, or type property returning one, ends in its kind after the
  plural noun: `…List` for an array (`jobsList`, `get pageFontsList()`, `getJobsList()`), `…Set` for
  a `Set` (`usedIdsSet`), `…Map` for a `Map` or a `Record` used as a dictionary, bare or inside
  `Readonly<…>` (`partsMap`), `…Cache` for an array derived or memoised from another (`linesCache`).
  Constants follow in UPPER_SNAKE (`CONTROL_WORDS_SET`). A tuple (`[x, y]`) is not a collection. A
  property an external format names — a key of an input JSON file, a tool's output, or an API
  response — keeps the format's name, and its type carries `/** @external … */` so the checker
  exempts it.
- **Indexes end in `Idx`.** Anything holding a 0-based index — a loop counter, an `indexOf` or
  `findIndex` result, a callback's index parameter, a field — ends in `Idx`, named after what it
  indexes (`slideIdx`, `rowIdx`), or is a bare `idx` when nothing fits better. A 1-based position
  ends in `No` (`slideNo`), never `Idx`, a loop counter that starts at 1 included.
- **No shadowing.** A variable, parameter, or local function never reuses a name visible from an
  enclosing scope — an outer local, a parameter, an import, or a module-level name — so a nested
  `idx` cannot hide the outer one.
- **Paths end in `Path`.** A string holding a file or directory path ends in `Path` (`workDirPath`,
  `plainPromptPath`, `REPO_ROOT_PATH`); a bare file name ends in `Name` (`fileName`). A bare `path`
  says too little, and destructuring keeps the suffix: `{ binaryPath }`, never
  `{ binaryPath: binary }`. A bundler config (a `webpack.*`, `vite.*`, `rspack.*`, or `rsbuild.*`
  file) names its paths `p<What>` instead (`pRoot`, `pSrc`, `pDist`): one short prefix lines up the
  paths of a long config, and the checker holds those files to it.
- **Objects carry their role.** A value of a class or role interface ends in that type's role word:
  `progressObserver` holds a `TerminalProgressObserver`, `logger` a `Logger`, `commandLine` a
  `CommandLine`, `zipArchiveRW` a `ZipArchiveRW`.
- **A collaborator is named for what it is, not what it does for the holder.** A field holding a
  class is that class's name (`#authService: AuthService`, never `#session: AuthService`), so
  renaming the class renames its holders; a dependency known by its role takes the role
  (`#notifier`, `#logger`). Several collaborators of one kind travel as one object typed to what the
  class uses (`#stores: Pick<Stores, "settings" | "cache">`), never a field each.
- **Full words.** No single letter or vague word (`value`, `data`, `raw`, `item`, `result`, `ts`,
  `dir`, `err`) names a variable, parameter, or field; name what it holds (`textSizePt`,
  `fieldValue`, `error`). Numeric coordinates `x`, `y`, `w`, `h`, comparator parameters `a`, `b`,
  and the parameters of a one-line callback (`linesList.map(l => l.text)`) may stay short; nothing
  else does (`host`, not `h`).
- **Numbers carry their unit.** Every numeric name ends in its unit, a constant in UPPER_SNAKE and
  anything else in camelCase: `In`, `Pt`, `Px`, `Emu`, `Em`, `Ms`, `S`, `Deg`, `Pct` (0–100),
  `Ratio` (a share, 0–1), `Scale` (a multiple of a base size), the noun it counts (`Chars`, `Lines`,
  `Words`, `Tokens`, `Frames`, `Bytes`…), `Version`, `Id`, `No`, `Idx`, `Count`, `Code`, `Units` for
  a format's own unit its comment names, or `Number` in a generic helper whose caller decides the
  unit; a rate is `<A>Per<B>` (`EMU_PER_INCH`, `charsPerLine`). A count ends in `Count`
  (`reusedCount`, never `reused`), and coordinates `x`, `y`, `w`, `h` stay bare. So
  `STEP_RATIO = 0.25`, `CARD_GAP_IN = 0.25`, `cardWidthIn`, `textSizePt`, `intervalS`.
- **Booleans ask a question.** A boolean variable, parameter, or field starts with `is`, `has`,
  `should`, or `can` (`isDocxKept`, `hasHint`, `shouldAssign`, `isBold`), never a bare adjective or
  participle (`open`, `failed`, `bold`, `noAssign`). A boolean query keeps `get isX()`/`getIsX(…)`
  ([§ Members](#members)); `isX(…)`/`hasX(…)` names only a type predicate (`value is Json`).
- **Functions start with a verb**, and the verb says what the call costs: `get` (a query on what is
  in hand), `read` and `write` (I/O), `parse` (text into data), `fetch` (network), `load` (a file
  the package ships), `build`/`compose` (pure construction, so built text is `build`, never
  `write`), `find` (a first match or null), `count`, `format`, `to…` (a conversion),
  `check`/`validate`, `run`. A query returning a collection is `get` with the kind at the end —
  `getJobsList(…)`, `get #packageKindsList()` without parameters, `readEntryNamesList(…)` when it
  reads files — never `list…`, which repeats the kind as a verb. A noun (`ownLines`, `letters`,
  `attrsOf`) or an adjective (`claimed`) hides whether it reads or acts. A unit conversion reads
  `<from>To<to>` (`ptToEmu`); log-level methods (`warn`, `error`) and `main` keep their names, and
  so does an `override` method, named by its base class. The checker holds the verb set, only verbs
  the code uses, and fails any other first word.
- **Files and folders are kebab-case.** The barrel key spells the stem in camelCase, with a capital
  first letter for a class: `log-progress-observer.ts` holds `LogProgressObserver`,
  `note-timing-parser.ts` is keyed `noteTimingParser`. An acronym is one lowercase word in the file
  and keeps its capitals in the key (`work-dir-rw.ts` holds `WorkDirRW`), so key and stem match with
  hyphens and case set aside. A role suffix follows the stem (`github-release-source.adapter.ts`,
  `build.command.ts`, `env.error.ts`, `cli-interactive.run.ts`); a suite takes its module's stem
  (`log-progress-observer.test.ts`). Skill scripts and assets follow the same rule
  (`release-notes-builder.ts`). The checks fail on a camelCase or snake_case file and on a key or
  default export that differs from its stem.

## Types and values

- **`type` by default** — data shapes, unions, intersections, mapped types, function signatures.
  **`interface` only for a role a class implements**, so `interface` always reads as a contract a
  class plays; the checker fails on an interface no class implements.
- **A parameter's type says what the value is, not only its primitive.** A value with a source or a
  shape a bare type hides takes a named type that states it, declared by the module that reads it: a
  CLI runner takes `argvSource: ArgvSource`, where
  `ArgvSource = Readonly<{ argv: readonly string[] }>` and the entry passes `process`, not
  `argvList: readonly string[]` with a `process.argv.slice(2)` at every call site. A caller then
  cannot pass the arguments where the whole argv belongs, or the reverse; a structural type keeps
  the platform type out of the port.
- **Generics.** One letter (`T`, `K`, `V`) when trivial; descriptive (`TItem`, `TError`) with two or
  more, or when the role is not obvious. A type parameter appears at least twice — relating an input
  to the output, or two inputs — or it is noise.
- **Nullish.** `value?.field ?? fallback`, not `&&` / `||` chains, so falsy-but-valid values (`0`,
  `""`, `false`) survive.
- **Strict equality.** `===` / `!==` only, never `==` / `!=`, including `x == null`. For
  `T | null | undefined` write a check for each state the type allows
  (`x !== null && x !== undefined`).
- Lint enforces equality (`eqeqeq`) and, with type information, nullish and optional chaining and
  single-use type parameters; the naming checker enforces collection, index, path, role, unit,
  boolean, verb, and full-word names, shadowing, field groups, public mutable fields, export key
  order, the `interface` rule, parameter shape, adapter construction, constructor bodies, and
  repeated literals.

## Layout

Prettier lays out each statement; blank lines between statements are the code's paragraphs, so a
reader sees where one thought ends:

- A block or a statement that spans several lines is followed by a blank line.
- A group of declarations has a blank line before and after it; consecutive one-line declarations
  stay together.
- `return`, `if`, a loop, `switch`, and `try` have a blank line before them.
- Two expression statements in a row have a blank line between them unless they act on the same
  subject: the same receiver (`fs.copyFileSync`, then `fs.writeFileSync`), the same function, or the
  same assigned object (`this.#a = …`, `this.#b = …`). `await` and `void` do not change the subject,
  and a chain's subject is its root receiver.

```ts
event.preventDefault();

this.#pendingPathsList.push(filePath);

if (this.#isReady) {
  this.#schedule();
}

this.#pendingSignIn = { app, startedAtMs: this.#getNowMs() };

await this.#surface.openInBrowser(authorizeUrl);

return { kind: "started" };
```

ESLint's `padding-line-between-statements` can hold the first three; the same-subject rule needs a
rule of the repository's own or review.

## Composition only

- No `extends` for reuse or specialisation. A class gains behaviour by holding a collaborator and
  delegating to it.
- `implements` is the polymorphism mechanism. Interfaces stay small — one role each.
- Three exceptions: `extends Error` for typed errors, `extends EventerBase<Listeners>` for a class
  that publishes events ([§ Events](#events)), and a base class a framework requires, such as a UI
  framework's component class where the framework accepts only a class.
- No `abstract` classes and no `protected` members outside the event library; both exist only to
  serve inheritance. Mixins are inheritance too.
- Inheritance-based patterns take their composition form: Template Method becomes an injected
  Strategy for the varying step; a Factory Method subclass hook becomes a factory function or
  registry passed in.

## Events

A class that announces what happens to it publishes events; it never takes a notification callback.

- **An event is a notification** — progress, a state change, a step that needs the user. The
  publisher does not know who listens or how many, and a listener returns nothing. The class extends
  `EventerBase<Listeners>` from the repository's event library (`code-architecture` § Lib roles) and
  calls `this.emit(name, …args)`; holders subscribe with `addEventListener`.
- **The listeners map is a `type` named `<Role>Listeners`** in the type root beside the class or the
  role interface it implements. Event names are camelCase (`progress`, `signInRequired`); listener
  parameters carry their unit or count (`positionMs`, `doneCount`). A role interface takes the
  subscribe side as `extends Listenable<Listeners>`, and a test fake extends `EventerBase`.
- **Subscribe once, where the publisher is wired** — the static factory or composition root that
  builds it, never a constructor. A listener added per call stacks; only a publisher created for one
  call is subscribed in that call. A subscriber that lives shorter than its publisher (a view, a
  job) subscribes when it starts and unsubscribes when it ends.
- **What stays a parameter:** a callback that returns a value (a Strategy, `use` in
  `withX(path, use)`, a comparator); a stream that belongs to one call, such as a spawned process's
  lines in its run spec, since an instance's listeners hear every call; and an injected collaborator
  the class calls (a progress Observer, a logger).
- **A component's props follow its framework's convention**: an `on…` prop stays a prop, and the
  component is named for what it renders; the checker takes a PascalCase function in a `.tsx` file
  for a component.
- The checker fails on a parameter named `on…` with a function type, on `extends` other than
  `Error`, `EventerBase`, or a UI framework's component class in a `.tsx` file, and on `abstract` or
  `protected` outside the event library.

## GoF patterns

A pattern names a shape the problem already has. Use one when the shape exists today — two backends
now, a tree now — not in anticipation of one.

| Pattern                 | Use when                                                         | TypeScript shape                                                                       |
| ----------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Strategy                | One job, several interchangeable algorithms or backends          | `interface Exporter { export(…) }` with one class per backend                          |
| Factory or registry     | Picking the right Strategy from a key or an input                | `ReadonlyMap<Kind, () => Exporter>` or a static `from(kind)`                           |
| Builder                 | Assembling a complex output in steps (XML part, query, report)   | Methods add parts and return `this`; `build()` returns the finished value              |
| Facade                  | Callers need one door into a subsystem of cooperating objects    | Class owning the subsystem; its methods are the only way in                            |
| Adapter                 | An external tool, CLI, SDK, or OS API must fit your interface    | Class implementing your interface, translating calls, data, and errors                 |
| Composite               | A tree of parts handled uniformly (shapes, AST, menus)           | `interface Node { render(): Out }` with leaf and container classes                     |
| Chain of Responsibility | The first handler that accepts an input wins                     | Ordered `Handler[]` with `getIsAccepting(x)` and `handle(x)`; the last is the fallback |
| Decorator               | Retry, caching, logging, or timing around an existing object     | Class implementing the same interface and holding the wrapped instance                 |
| Command                 | Operations to queue, log, preview as a dry run, or undo          | `{ readonly description: string; execute(): void }`                                    |
| State                   | Behaviour switches on a lifecycle state (ticket, upload, socket) | One class per state behind a shared interface; the context holds the current one       |
| Observer                | Several independent consumers react to one source                | The source extends `EventerBase<Listeners>`, per [§ Events](#events)                   |

Avoid Singleton for anything with state (pass the instance in), Service Locator (it hides
dependencies), and pattern stacks that outnumber the implementations (a factory building a builder
for the only strategy).

## Module organisation

- One concept per file, named after its main class per [§ Names](#names). A file splits when a
  second concept appears, not when it grows long.
- Three layers, dependencies pointing inward:
  - **Entry** — CLI `main`, request handler, job runner. Parses input, constructs objects, maps
    errors to exit codes or responses. Holds no domain logic.
  - **Domain** — classes holding the rules. Pure where possible; I/O only through injected
    interfaces.
  - **Adapters** — file system, processes, network, vendor SDKs. They implement interfaces the
    domain declares in its folder's `types.ts`, never in the adapter's own module.
- In a package, the domain and its adapters are the core layer and the entry sits on top of it, over
  a base of concept-free building blocks (`code-architecture` § Layers).
- Export the class and the types its callers need, through the package barrel when the code lives in
  a package (`code-architecture` § Packages, namespaces, barrels). A type sits in the module that
  defines it, and a class module's stateless helpers are utils of its concept (`code-architecture` §
  Package anatomy).
- No circular imports. Two modules that need each other are missing a third concept. A module and
  its own package barrel are the one sanctioned cycle.
- Variants of data are discriminated unions with an exhaustive `switch` that ends in a `never`
  check, not class hierarchies. When two places split the variants between them (a reducer and the
  effect that runs what needs I/O), each lists every variant, the other's as a bare `case` that
  returns, so a new variant does not compile until it is placed.
- Configuration values (colours, sizes, names, paths) live in one typed config object loaded at the
  entry point, not as literals scattered through the domain. Its type is readonly all the way down —
  every field, nested object, and collection (`Readonly<{ …; pathsList: readonly string[] }>`) — so
  no consumer changes it for the next. Only a long-lived process that shares it across requests also
  `Object.freeze`s it.
- Domain and adapters return expected outcomes and throw typed errors for faults
  ([§ Outcomes and faults](#outcomes-and-faults)); only the entry layer prints and exits.
- Every `if`, `else`, and loop body goes in braces, a one-line guard included:
  `if (referenceListing === undefined) { return; }`, which Prettier lays out on three lines. ESLint
  enforces and fixes it (`curly: all`).

## Outcomes and faults

An outside system's ordinary answers are values; only what no caller plans for throws.

- **An expected outcome is a union member.** Not found, denied, signed out, offline, busy: a call to
  a store, a service, or a tool returns a discriminated union its caller must switch on, and a state
  the user must act on carries what to tell them:

  ```ts
  type RecordReadOutcome =
    | { status: "found"; recordText: string }
    | { status: "missing" }
    | { status: "denied" | "failed"; message: string };

  type SignInState =
    | { status: "signedIn"; accountName: string }
    | { status: "signedOut"; reason: string; fix: string };
  ```

  The type checker then fails a caller that forgets a case; a thrown "missing" fails at run time, on
  the path nobody tried.

- **A fault throws a typed error** ([§ Typed errors](#typed-errors)): a bug, a broken invariant, bad
  input the entry layer maps to an exit code, an outside answer the code cannot interpret.
- **The adapter decides which is which, once.** It catches the vendor's error, maps the cases its
  callers plan for to outcomes (`ENOENT` → `{ status: "missing" }`), and wraps the rest in its typed
  error with `{ cause }`. Code above it never reads a vendor error code or an HTTP status.
- **A process boundary never rejects.** A request that crosses into another process or a UI answers
  `{ isOk: true; data: T } | { isOk: false; code: "refused" | "failed" | "timeout" }`, so the asking
  side can always tell what happened; the failure's detail stays in the answering side's log.
- **An error says whether retrying helps.** Its one-line doc comment names what a caller should do —
  wait for the network, fetch a fresh URL, sign in again, give up — and retry logic decides by the
  class: a request the other side rejected (HTTP 4xx) is never retried as a passing fault.
- **No call to the outside can hang.** Every network read and process wait has a timeout
  (`AbortSignal.timeout(REQUEST_TIMEOUT_MS)`); when it fires, the caller gets its fault or its
  `timeout` outcome.

## Typed errors

A failure a caller may handle differently is its own class:

```ts
/** Bad or missing flags: the runner prints the command's usage after the message. */
class CliUsageError extends Error {
  override readonly name = "CliUsageError";
}
```

- **The name carries its scope**: `<Scope><What>Error`, with the package or concept that throws it
  first (`CliUsageError`, `ZipEntryMissingError`, `LintArgsError`), never a bare `UsageError` or
  `ParseError` that two packages would both define.
- **`override readonly name` repeats the class name** as a literal. `error.name`, the stack header,
  and the log line then show the class instead of `Error`, and a caller can narrow on the literal
  where `instanceof` fails: two bundled copies of one lib each define their own class. The checker
  fails an error class whose name does not end in `Error` or whose `name` field is anything else.
- **The class holds no logic.** It adds a field initializer at most; the message arrives through
  `Error`'s constructor, and a wrapped failure keeps its origin as
  `new XError(message, { cause: error })`.
- **It lives in the layer that throws it**, in its own `<scope>.error.ts` file, the class name
  without its `Error` (`cli-usage.error.ts` holds `CliUsageError`, `env.error.ts` holds `EnvError`),
  default-exported and keyed by the class like any class module.
- Catch it by its class or its `name` at the entry layer, which maps it to an exit code or a
  response; code below rethrows what it cannot handle.

## Packages, namespaces, barrels

<!-- MAINTENANCE: pointer only; the package rules live in code-architecture. -->

Lives in `code-architecture` § Packages, namespaces, barrels.

## Single source of truth

Logic, constants, types, and stateful patterns live once; everything else imports them.

- **Constants** — one definition per concept; a literal that appears three or more times is a
  constant.
- **Closed sets of strings** — a set of names (stages, cache files, flags) is a literal-union type
  or one constants object: `start(stage: Stage)`, `WORK_FILE_NAMES.frames`. The checker fails a
  string literal passed as a plain `string` twice in one module, as an argument or an option value;
  a suite keeps its literals inline and is exempt.
- **Files that cannot import** — a value a file must repeat because it cannot import the constant
  (`package.json`, YAML, SQL, a CI workflow) is checked against the constant by a test.
- **Functions** — one implementation per behaviour. Two near-duplicate blocks become a function;
  repeated control flow over a list becomes `map`, `filter`, or `reduce`.
- **Computed values** — a synchronous call whose result does not change runs once, and its result
  stays in a `const`, or in a field when it outlives the call; callers read it, never re-run it. A
  value that cannot exist yet (it needs later input, such as parsed flags) is one accessor that
  computes on first read and memoises in a `#field` (`this.#io ??= open(…)`), never a closure each
  caller re-runs.
- **Types** — defined once and imported with `import type` or through the type root; never
  redeclared, never copied across packages.
- **Shared state or effects** — two classes that share state logic share a collaborator, not a copy.
- **Variants** — when a family keyed on a discriminant (`kind`, `format`) already has a shared
  handler, a new member extends its union and its branches; never fork a near-copy for one variant.
  A variant that truly diverges branches inside the shared handler.
- Code two packages need moves to a lib (`code-architecture` § Where code lives).

## Balance with simplicity

This standard decides how the code that must exist is organised. A YAGNI rule decides whether it
exists at all. Where both apply:

- An interface with a single implementation is allowed only at an Adapter boundary, where it
  isolates an external system.
- A single-purpose script under about 100 lines stays a few functions in one file.
- A class with no state and one method is a function.

## Example

Strategy for interchangeable renderers, Adapter around the OS scripting host, composition throughout
— no base class:

```ts
interface ScriptRunner {
  run(script: string, argsList: readonly string[]): string;
}

type PdfPaths = Readonly<{ inputPath: string; outputPath: string }>;

interface PdfRenderer {
  readonly id: string;
  readonly isAvailable: boolean;
  render(paths: PdfPaths): void;
}

class OfficeAppRenderer implements PdfRenderer {
  readonly #officeApp: OfficeApp;
  readonly #scriptRunner: ScriptRunner;

  constructor({
    officeApp,
    scriptRunner
  }: Readonly<{ officeApp: OfficeApp; scriptRunner: ScriptRunner }>) {
    this.#officeApp = officeApp;
    this.#scriptRunner = scriptRunner;
  }

  get id(): string {
    return this.#officeApp.id;
  }

  get isAvailable(): boolean {
    return this.#officeApp.isInstalled;
  }

  render({ inputPath, outputPath }: PdfPaths): void {
    const stagedPath = this.#officeApp.stage(inputPath);

    this.#scriptRunner.run(this.#officeApp.exportScript, [stagedPath, outputPath]);
  }
}

class PdfExporter {
  readonly #renderersList: readonly PdfRenderer[];

  constructor({ renderersList }: Readonly<{ renderersList: readonly PdfRenderer[] }>) {
    this.#renderersList = renderersList;
  }

  export(paths: PdfPaths, preferredId?: string): string {
    const renderer = this.#renderersList.find(
      candidate => candidate.isAvailable && (!preferredId || candidate.id === preferredId)
    );

    if (!renderer) {
      throw new PdfRendererMissingError(preferredId);
    }

    renderer.render(paths);

    return renderer.id;
  }
}
```

## Review checklist

- Every class owns state or an external boundary; a stateless one-method class becomes a function.
- File, class or key, and type namespace share one `<what><Role>` name; the file is kebab-case.
- No public fields; no internal collection handed out mutable; `readonly` fields, a blank line, then
  mutable ones.
- Collections end in `List`, `Set`, `Map`, or `Cache` after a plural noun; 0-based indexes in `Idx`;
  paths end in `Path` (`p<What>` in a bundler config), objects in their role word, numeric constants
  in their unit, and no name is a single letter or vague word; no name shadows an outer one.
- A parameter whose value has a source or shape beyond its primitive takes a named type.
- `type` for data, `interface` only for a class's role; generics appear twice; `?.`/`??` over
  `&&`/`||`; `===` only.
- No duplicated constant, function, type, or variant handler.
- A synchronous computation runs once: its result is a `const` or a memoised field, not a closure
  each caller re-runs.
- Config types are readonly all the way down.
- Parameterless queries are accessors (`get x()`, `get isX()`); queries with parameters are
  `getX(…)`/`getIsX(…)`; commands and factories are verbs (`drawTable`, not `table`).
- Private members are `#private`; TypeScript `private` appears only on a factory-only constructor.
- No `extends` beyond `Error`, `EventerBase`, or a framework base; `abstract` and `protected` only
  in the event library.
- Notifications are events on the publisher, never `on…` callback parameters.
- Collaborators injected through constructors and typed as interfaces; a port lists only the members
  its consumer calls.
- A constructor takes `(deps, options?)`, the logger inside `deps`; each dependency has one name
  everywhere, in the repository's one order, and a field holding a class is named after it.
- Names are what a person would search for; a recurring thing has one word (`response`).
- Blank lines separate blocks, declaration groups, and statements on different subjects, and come
  before `return`, conditions, and loops.
- Vendor, OS, and process types confined to adapters.
- An outside system's expected answers are union members the caller switches on; faults throw; a
  request across a process boundary answers a result and never rejects; every outside call has a
  timeout.
- Entry points parse, wire, and report — nothing else.
- Each typed error is `<Scope><What>Error` with `override readonly name` set to its class name.
- Data variants are discriminated unions with exhaustive switches.
- Braces on every `if`, `else`, and loop body, one-line guards included.
- Code in a package also passes the `code-architecture` review checklist, and its tests the
  `code-unit-tests-architecture` one.
- When a class plays a pattern role its name does not reveal, its one-line doc comment names it.
