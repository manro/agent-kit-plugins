---
name: electron-architecture
description: >-
  Electron standard for desktop apps: a program per process, main on the code-architecture layers,
  sandboxed windows on a privileged app scheme, a typed preload bridge, fuses, release channels,
  signing, notarizing, and updates. Use when writing or reviewing an Electron app or its release.
---

# Electron Architecture

An Electron app follows `code-standards` and `code-architecture`, and its windows follow
`react-architecture`; this skill adds what Electron decides: which process does what, how a window
is opened and kept, how a page reaches main, and how the app is packaged, signed, released, and
updated. [references/main-process.md](references/main-process.md) holds the programs, the main
process, the preload, the contract, and the windows' common code: typechecked against Electron 45
and React 19, unit tested, and run under Electron by a smoke test.
[references/release.md](references/release.md) holds the packaging, the update path, and the release
workflow with its cloud access: the packaged build and the workflow's version gate were run, while
signing, notarizing, and publishing need the release identities and were not. Build an app from
them, and hold an existing one to them.

## When to use

**MUST** apply when writing, changing, reviewing, or planning an Electron app's main process,
preload, window wiring, IPC, packaging, updater, or release workflow.

## Scope

- An Electron app's `src/main/`, `src/preload/`, `src/shared/`, and `src/renderer/` layout
- Its packager config, the `build/` resources, and the workflow that releases it

## Repository facts

- **Its packager** (electron-builder or Electron Forge) and **its bundler** per program, with their
  versions, from `package.json`.
- **Its platforms and release channels**, the server each channel talks to, and where each channel's
  update feed lives.
- **Where signing lives**: the secrets of one CI environment per channel. A developer's machine
  holds no release identity.
- **Its state and log libraries**, as `react-architecture` § Repository facts reads them. Never add
  one to a repository that has its own.

## Processes

| Program    | Runs                                 | Holds                                            | Environment      |
| ---------- | ------------------------------------ | ------------------------------------------------ | ---------------- |
| `main`     | Node and Electron, once              | The app: its state, the OS, the network, windows | Node, no DOM     |
| `preload`  | Sandboxed, before each window's page | The bridge, and nothing else                     | DOM and Electron |
| `renderer` | Each window's page                   | The windows and what they share                  | DOM, no Node     |
| `shared`   | Imported by the three                | The IPC contract, its channel names, their types | Neither          |

- **One program per process, with a tsconfig of its own** (`code-architecture` § Environment
  tsconfigs). Every type lives in the package's type root, and a program sees a type only when its
  tsconfig includes the module that declares it, so main's types never reach the preload or a
  window.
- **Main owns the app's state and does the app's queries.** An app window holds a copy of main's
  state, asks main through the bus's named requests, and never calls the server (`code-architecture`
  § State with one owner).
- **A window that hosts the product's web app** runs it unchanged: that app fetches its own data
  from the server through the app scheme, which main proxies, and finds the desktop through the
  bridge. It is the one kind of page that calls the server; main's state stays out of it.
- **The preload is a bridge, not code.** It builds the bridge from the channel names, exposes it,
  and holds no logic, state, or schema library. It is bundled into one file: a sandboxed preload can
  `require` only `electron` and a few Node built-ins.

## Layout

```text
src/
  index.ts                      the type root
  main/
    main.run.ts                 the entry: switches, the lock, the scheme, then the root
    config/                     the config built from the host; the release channel table
    base/                       what knows no concept: the lifecycle, the logger
    core/<concept>/             what the app does; never imports electron
    shell/                      the entry layer: windows, the app scheme, IPC, the OS's doors
      composition-root.ts       builds every part once
  preload/                      the bridge each window gets
  renderer/
    assets/                     the default page every window starts from, and the theme
    common/                     what every window uses:
      bus/                      main, as a window calls it, built from the bridge
      hooks/                    hooks every window uses (useAppSelector)
      components/ui/            building blocks: Button, Row, Section
      window-mount.ts           the one mount function
    windows/window-<name>/      one folder per window:
      index.ts                  mounts the window's component
      <Name>Window.tsx
      sections/                 the window's parts
      hooks/                    the window's own hooks
  shared/                       the IPC contract, its channel names, the copy's selectors
electron-builder.config.ts      the packager's config, which reads the channel table
build/                          the packager's resources: entitlements, icons
```

- **`electron` is imported only by `shell/`, `main.run.ts`, and the preload.** `shell/` is main's
  entry layer, in place of `cli/`: it is to the host what an adapter is to a process. A concept's
  need of the OS is a role its folder declares (a notifier, a secret store, a navigator), and a
  `shell/` module implements it, so `core/` runs its suites on fakes, without Electron.
- **Names say the kind of part.** In `shell/`, `app-` marks a part of the app
  (`app-scheme-handler.ts`, `app-updater.ts`), `os-` a door to the OS (`os-secret-store.ts`,
  `os-deep-link-listener.ts`), and `window-` a window (`window-main.ts`); in `renderer/`, each
  `windows/window-<name>/` pairs with main's `shell/windows/window-<name>.ts`.
- **A window reaches main only through `common/bus/`.** The bus turns the bridge into calls that
  resolve with data or throw (`bus.getAppInfo()`), pushes (`bus.listen.updateStatus`), and named
  requests that do not wait (`bus.actions.sendUpdateInstall()`); nothing else reads the bridge.
- **Code moves to `common/` only when every window uses it**; until then it stays in its window
  (`react-architecture` § Desktop renderer).
- **Modules take `code-architecture`'s shape** (§ Packages, namespaces, barrels): a class module
  default-exports its class, any other module an object of its functions and constants, components
  and hooks are named exports, and types join the root through `declare module "<package>"`.
- **Lint holds the boundaries**: `electron` outside the three, `ipcMain`, `ipcRenderer`, and
  `contextBridge` outside the composition root and the preload, `webContents.send` outside the
  publisher, the channel module outside the contract and the bridge, and the bridge outside the bus.

## The entry

- **A packaged app refuses the switches no fuse covers.** `--remote-debugging-port` and
  `--remote-debugging-pipe` let another process script every page, the bridge included, so the entry
  of a packaged app exits when it sees either.
- **The entry takes the single-instance lock before it builds anything.** A second launch hands its
  arguments (a link, a file) to the first through `second-instance` and quits without reading a file
  or opening the log; the composition root loads behind `import()` only after the lock.
- **What Electron takes only before ready happens in the entry**: the privileged scheme, the process
  error reporter, and the listeners for events that can fire before ready (`open-url`, `open-file`),
  with the launch's own arguments.
- **Building does nothing; `start()` touches the OS** (`code-architecture` § Inside an app). The
  lifecycle starts the session policy and the scheme before any window and the IPC router last, so
  the router stops first. The entry opens the first window once every part has started.
- **`will-quit` disposes**, never `before-quit`: a window's `beforeunload` can still cancel a quit
  after `before-quit`, and the app would run on with every part disposed. Only macOS stays open
  without a window (`window-all-closed`).
- **Build facts come from the packaged `package.json`.** The packager writes the channel, the
  server, and the feed into it (`extraMetadata`), and main parses it once at start; a release's
  server must be https. Only a development run reads the server from an environment variable, since
  whoever starts a released app must not send its traffic elsewhere; a malformed value stops the
  start.

## Windows

- **One window base opens every window**: `contextIsolation`, `sandbox`, `webSecurity` on, and
  `nodeIntegration` off. A window adds only its spec (page path, frame) and what it does; windows
  are one object keyed by name, and a service holds a role, never a window.
- **A window shows once its page has painted** (`ready-to-show`, with the page's background color),
  and its title is main's, never the page's `<title>`.
- **A window stays on the app's own pages.** `will-navigate` cancels any URL off the app's origin or
  under `/api/`, and the window-open handler denies every new window. Either hands a web or mail
  link to the system browser; any other scheme is dropped, since `shell.openExternal` runs whatever
  handles it.
- **A crashed page reloads, three times a minute at most**, then stays down and is logged, so a
  crash loop never spins the CPU.
- **A window that must keep time turns throttling off** (`backgroundThrottling: false`); the page
  then always reads as visible, so main's window state says when no one is looking.

## The app scheme

- **Pages load from a privileged `app://<name>` scheme, never `file://`.** Registered standard and
  secure before ready, it gives the pages a real origin for storage, cookies, and the content
  security policy; `file://` would give every page every file. The fuse that grants `file://` more
  is off.
- **The handler compares the request URL as text.** Node's `URL` gives a custom scheme the origin
  `"null"`, even a standard one.
- **A path resolves inside the pages' folder or is missing**; a path without an extension is an app
  route and gets `index.html`, for a window that hosts the web app.
- **Every page carries a content security policy** (`default-src 'self'`, no `object-src`, no
  `frame-ancestors`), so a page runs only the app's own code.
- **Main passes `/api/` to the server.** Pages call their own origin, so they need no CORS; main
  adds the app's version header and drops the page's `origin`, `referer`, and `host`. A 426 from the
  server marks the update required. Main may keep `GET` answers for read-only use offline, and
  forgets them on sign-out.
- **A server answer never runs as a page.** It shares the app's origin, so it carries
  `content-security-policy: sandbox; default-src 'none'` and `x-content-type-options: nosniff`, and
  neither navigation nor IPC accepts a URL under `/api/`: stored HTML or SVG cannot reach the
  bridge.

## IPC

`code-architecture` § Contracts between processes holds; Electron spells it so:

- **Channel names live in one module** that only the contract and the preload's bridge import, so
  the preload bundles no schema library.
- **The router binds every request and notice from one object** typed over the contract's keys, so a
  message the contract adds does not compile until main handles it. It registers in `start()` and
  removes every channel in `dispose()`.
- **The receiver checks the sender's frame** (`event.senderFrame.url`, one of the app's own pages)
  and the payload's schema, and refuses either failure with `refused`; a handler that throws answers
  `failed`, and the error's text stays in main's log.
- **One publisher sends main's pushes** to the open windows; nothing else calls `webContents.send`.
- **The bridge never rejects**: an invoke resolves `refused`, `failed`, or `timeout` (10 s). It
  checks the key with `Object.hasOwn`, since a page's script is not typed. `contextBridge` copies
  own properties only, so the bridge's methods are handed over bound, and a page gets `invoke`,
  `send`, and `subscribe`, never `ipcRenderer`.
- **A dropped file's path comes from the preload** (`webUtils.getPathForFile`); `File.path` is gone.

## The OS's doors

- **A secret lives in a file encrypted with `safeStorage`'s async calls**, whose key the OS keeps
  for the app; written to a temporary sibling and renamed, readable by its user only, and written
  again when the OS asks (`shouldReEncrypt`). One that cannot be decrypted is signed out. None is
  kept without a key from the OS, including Linux's `basic_text` backend, whose key is built into
  Chromium. Never in settings or a page.
- **Sign-in goes through the system browser** with PKCE, back to the channel's own scheme, since
  identity providers refuse sign-in inside an app window. The link arrives as `open-url` on macOS
  and in a second instance's arguments elsewhere, and waits for `start()`.
- **Files the OS opens with the app** (Open With, a drop on its icon) arrive as `open-file`, one
  event each and possibly before ready, so they are collected and handled together.
- **One session policy refuses every permission** outside a short list, and every permission a page
  off the app's own pages asks for; no page attaches a `<webview>`. Its deny handlers stay set when
  it is disposed, since Electron's default grants everything.
- **Text a person reads names the channel's app** (`config.productName`): windows, notifications,
  the tray, and the menu.

## Errors and logs

- **The process error reporter listens first**: uncaught errors, unhandled rejections, and helper
  processes that died (`child-process-gone`).
- **A window reports through the bus**: the mount function sends what the React root sees and what
  the page drops, per `react-architecture` § Errors.
- **Main logs to a file in `app.getPath("logs")`** through the repository's log library, with
  secrets blanked (`code-architecture` § Inputs and expensive steps).

## Release channels

- **Each channel is an app of its own**: its id, name, link scheme, icons, data folder, and update
  cache, so a dev build installs beside the released one with its own settings and sign-in.
- **One channel table** is read by the app and by the packager's config. No name is `dev`, so only a
  build that says `prod` is the released app.

## Packaging, signing, and updates

[references/release.md](references/release.md) holds each rule with its config and checks.

- **Each program is bundled; no `node_modules` ships.** The package holds the bundles and the
  manifest in an asar, and its runtime dependencies are dev dependencies the bundler inlines.
- **The fuses lock the binary**: no `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS`, or `--inspect`; the app
  loads only from its asar, whose integrity is checked; `file://` gets no extra privileges; cookies
  are encrypted. A smoke test therefore drives the unpackaged app, and a check tries the packaged
  one.
- **macOS builds are signed with the Developer ID**, under the hardened runtime with the JIT
  entitlement only, notarized with an App Store Connect key, and stapled. A local build is signed ad
  hoc with the hardened runtime off, and never updates itself.
- **Updates come from the channel's public feed**: checked at start and every few minutes,
  downloaded in the background, installed on quit or when the person asks. The feed file is
  published last and never cached. A server that must break old apps raises its minimum version, and
  an app below it shows that an update is required.
- **A release runs by hand, per channel**, as a dry run by default. Checks that can refuse it run on
  Linux first, and a 403 from the feed passes only on a first release. The macOS build holds the
  signing secrets and no cloud access; a separate job that installs nothing publishes its artifact
  with the channel's role, assumed through the CI's OIDC token (`ci-cloud-oidc`), and no job
  restores a cache.
- **The signing identity is one for every channel**, so every environment that holds it, dev
  included, accepts protected branches only: a branch anyone can push must not reach the certificate
  or the notary key.

## Tests

- **`core/` runs on fakes**, and `shell/`'s policies (the route, the crash budget, the router over a
  fake `ipcMain`, the bridge over a fake `ipcRenderer`) run without Electron
  (`code-unit-tests-architecture`).
- **A smoke test drives the built app** with Playwright's `_electron`, a throwaway
  `--user-data-dir`, and a stub server: the origin, both policies, the bridge, the proxy, a
  cancelled quit, the second instance, and the shutdown.
- **The packaged build is tried too**: its fuses read back, it starts, it refuses
  `ELECTRON_RUN_AS_NODE`, `--inspect`, and `--remote-debugging-port`, and it ignores the development
  server variable.

## Review checklist

- One tsconfig per program; main's types unreachable from the preload and the windows; modules in
  `code-architecture`'s export and type shape.
- `electron` only in `shell/`, the entry, and the preload; `core/` declares roles and runs on fakes.
- The renderer in `assets/`, `common/` (bus, hooks, `components/ui/`, the mount function), and
  `windows/window-<name>/`; app windows read main's copy through the bus and never call the server.
- The entry refuses remote debugging when packaged, locks first, registers the scheme and the
  before-ready listeners, then loads the root; parts touch the OS only in `start()`; the router
  starts last; `will-quit` disposes.
- Every window from one base: isolated, sandboxed, no Node; shown when painted; kept on the app's
  own pages; web links to the system browser only; crash reloads capped.
- Pages on a privileged app scheme with a CSP; paths kept inside the pages' folder; `/api/` through
  main with the version header, sandboxed and unsniffed; 426 handled.
- One contract: channel names in one module, every message bound in one object, sender frame and
  schema checked, one publisher, a bridge that never rejects and exposes no transport.
- Secrets through `safeStorage`'s async calls, never under `basic_text`; sign-in through the system
  browser; deep links and opened files kept until start; permissions refused by default, and still
  after dispose; no `<webview>`.
- Channels as separate apps from one table; build facts in the packaged manifest; the release's
  server over https and not overridable when packaged.
- No `node_modules` shipped; fuses set; signed, notarized, stapled; local builds ad hoc.
- Feed last and uncached; release by hand, dry run first, version gate, per-channel environment and
  OIDC role on a publish job that installs nothing, no cache; every environment holding the signing
  identity limited to protected branches.
