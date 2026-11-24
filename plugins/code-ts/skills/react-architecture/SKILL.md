---
name: react-architecture
description: >-
  React standard for desktop renderers and web apps: components that only render, effects in named
  hooks, state through selectors and named requests, a layout per app kind, a web app's first-load
  shell and webpack or Vite build, and the repository's libraries. Use when writing or reviewing
  React code.
---

# React Architecture

React code follows `code-standards` and `code-architecture`; this skill adds what React decides. The
repository's state library and styling system stay: each rule below names a role, and the
repository's own tool fills it. A library is named only where it makes a rule concrete.

## When to use

**MUST** apply when writing, changing, reviewing, or planning React components, hooks, the folder
layout of a React app, or a web app's entries and chunks.

## Scope

- `**/*.tsx`, and the `.ts` modules beside them in a React app
- A web app's entries, page template, and bundler config

## Repository facts

- **Its app kind**, a desktop renderer or a web app ([§ App kinds](#app-kinds)), read from its
  entries and bundler config.
- **Its state library and styling system**, read from `package.json` and the existing components.
  Follow them. Never add a store, a query library, or a styling system to a repository that has its
  own; when a new app has none yet, ask the user which to use.
- **Its file naming and its import alias**, from its existing modules.
- **Its bundler and that bundler's version**, for a web app (webpack, Vite, or another): it spells
  the rules of [§ First load](#first-load) and [§ Build](#build).

## App kinds

|             | Desktop renderer                                     | Web app                                                |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------ |
| Runs        | In a window of a desktop shell (Electron), from disk | In a browser tab, downloaded on each visit             |
| Unit of UI  | A screen: one window, with its own entry             | A page: one route, a lazy chunk of one entry           |
| State owner | The host process; a screen holds a copy              | The app's own models, over its services and the server |
| First paint | The window shows once its copy holds the snapshot    | A shell paints before the app's code runs              |
| Layout      | [§ Desktop renderer](#desktop-renderer)              | [§ Web app](#web-app)                                  |

The other sections hold for both kinds, except where a rule names one.

## Files and folders

- **`.tsx` is for components and hooks only.** A module with neither (a client, a helper, the mount
  function, types) is `.ts`, and a component or hook never sits in a `.ts` file. Lint can check both
  directions.
- **A component's file is its PascalCase name** (`SettingsScreen.tsx`, `ui/Button.tsx`), a hook's
  file is the hook (`useServerDraft.tsx`), and every other module follows the repository's naming.
- **Components are named exports** (`export const Button`), which React's tooling and its readers
  expect. A lazy page keeps its named export, and its `lazy()` call maps it
  (`import("./SettingsPage").then(module => ({ default: module.SettingsPage }))`). A component
  library built as a package follows `code-architecture` § Packages, namespaces, barrels for its
  entry.

### Desktop renderer

Folders follow screens. A screen is whatever the app shows as one unit: a window, a panel.

```text
common/                   what every screen uses
  components/ui/          building blocks: Button, Row, Section
  hooks/                  hooks every screen uses
  <client>/               the typed client to the state's owner
  mount-screen.ts         the one mount function
screens/<screen>/
  <Name>Screen.tsx
  sections/               the screen's parts
  hooks/                  the screen's own hooks
```

Code moves to `common/` only when every screen uses it.

### Web app

The source follows the layers of `code-architecture` § Layers, with `app/` as the entry layer in
place of `cli/` and `skeleton/` beside it:

```text
src/
  config/                 runtime settings, read once at startup, and the route list
  base/                   what knows no concept: log context, generic hooks
  core/<concept>/         one domain: its endpoints, service, model, and types
  core/http/              shared mechanics are concepts too: the HTTP client,
  core/router/            the typed router,
  core/overlay/           and the dialog host
  app/
    App.tsx               the providers
    router/               the route table, its lazy pages, and the guard
    pages/<page>/         <Name>Page.tsx, sections/, hooks/, and the model the page owns
    comp/ui/              building blocks: Button, Field, Dialog
    comp/<feature>/       a component two pages use
  skeleton/               the first-load shell (§ First load)
  index.ts                the bootstrap entry
  index-app.ts            the app entry: mounts App
```

- **Imports point down**: `app/` → `core/` → `base/` and `config/`. A concept never imports `app/`:
  a route path, a theme value, or a dialog it needs is passed in, or moves down to it. `skeleton/`
  imports only dependency-free leaves. The lint region checks resolved imports, aliases and barrels
  included, and a cycle check on the same graph fails two concepts that import each other
  (`code-standards` § Module organisation).
- **The core aggregate is a facade for `app/`.** A module in `core/` or `base/` imports the concept
  it needs directly, never the aggregate, so no import order matters and no startup path evaluates
  every concept; the bootstrap entry and the shell never import it.
- **Services are built and started at bootstrap**, once, by the app's composition root
  (`code-architecture` § Inside an app): none subscribes to the window or opens a socket when its
  module loads.
- **A component moves to `comp/` when a second page uses it**; until then it stays in its page.
- **Route policy stays in `app/router/`**: the route table, the guard, and its access decisions.
  `core/router/` holds the mechanics, and `config/` the route list both read
  ([§ Routing and overlays](#routing-and-overlays)).

## Components

- **One declaration form.** A component is a PascalCase const typed `React.FC`, followed by its name
  for React's devtools and error messages:

  ```tsx
  type Props = Omit<React.ComponentProps<"button">, "type">;

  /** A plain push button; never submits a form. */
  export const Button: React.FC<Props> = ({ className, ...buttonProps }) => (
    <button type="button" className={mergeClasses(BUTTON_CLASSES, className)} {...buttonProps} />
  );

  Button.displayName = "Button";
  ```

- **The props type is `Props`** when it is the module's only type, and `<Component>Props` when other
  types sit beside it. A component that wraps an element extends that element's props
  (`React.ComponentProps<"button">`) and omits what it fixes.
- **A component renders.** It reads state, derives values, and returns markup. An effect
  (`useEffect`, `useLayoutEffect`) or a subscription lives in a hook, never in a component file;
  lint can refuse both there.
- **A small part used by one parent** stays a private component in the parent's module, declared the
  same way.
- **A request that takes no arguments is passed as is** (`onClick={client.actions.sendShowLogs}`),
  and one with arguments is an inline arrow building them.
- **Every control has a label** and each section is labelled by its heading (`aria-labelledby` with
  `useId`); a live message is a `role="status"` region. The repository's accessibility skill, when
  it has one, decides the rest.

## Hooks

- **A hook is named for what it gives** (`useServerDraft`, `useRealtimeUpdateStatus`) and lives in
  its screen's or page's `hooks/`; the shared hooks folder holds only what several units use.
- **What a hook returns stays stable.** Each callback is a `useCallback`, and a returned object is a
  `useMemo` over them, so a caller can pass it on or depend on it.
- **A generic hook is a function declaration** (`export function useAppSelector<T>(…)`): an arrow
  needs `<T,>` in a `.tsx` file, which Prettier and lint disagree on.
- **An effect undoes what it starts**: its cleanup unsubscribes, cancels, and marks a read still on
  its way stale. When an effect both subscribes and reads once, it subscribes first and lets a push
  mark the read stale, so an older answer never overwrites a newer one.

## State

- **Components never fetch.** They read state through one typed selector hook
  (`useAppSelector(settingsSelectors.watch)`) and change it through named requests. In a desktop
  renderer the host process owns the state (`code-architecture` § State with one owner): a screen
  never dispatches to its copy or writes it. In a web app the models live in the same process: they
  do the fetching, components read them through the selector hook and call them through hooks, and a
  view whose data has not arrived shows its fallback ([§ Mounting](#mounting)).
- **Local state holds what no one else needs**: an open menu, text the person is typing until they
  apply it. A value someone else owns is never mirrored into local state.
- **A model only for coordination.** In a web app, a request one component makes, with nothing else
  depending on it, stays an async handler in that component's hook, calling the concept's endpoint
  and holding its pending and error state. A model earns its place by coordinating: state several
  views read, dependent requests, retries, polling, or work that outlives a view.
- **A model lives as long as its state.** In a web app, state one page owns sits in a model created
  when the page mounts and disposed when it unmounts, one instance per mount, so two pages open at
  once never share it. State that outlives a page (the session, uploads in flight) sits in a
  long-lived model in its concept. Disposing a model drops its state and subscriptions; the requests
  and resources it started are stopped by their owner (`code-architecture` § Cancellable work).
- **Services publish, models translate.** A service owns what no render should touch (a recorder, a
  socket, the network status, a media engine): a framework-free class that publishes typed events
  (`code-standards` § Events). A long-lived model subscribes once, where the app wires it, and turns
  the events into state; a stream that one view shows goes to that view's hook, a subscriber that
  lives shorter than the service.
- **A Suspense boundary sits below a page's model.** In a web app, a tree that suspends before its
  first commit is thrown away and retried, so a model owned above the boundary starts while lazy
  children load, and one owned below it starts only after them. A model's lifetime follows
  `useEffect`, never a layout effect: when shown content suspends again, React hides it and runs its
  layout-effect cleanups but keeps its effects. It survives the extra cleanup and setup of strict
  mode.
- **Real-time streams go past React's render.** Progress and other values that change many times a
  second go neither through the store nor through a hook every unit shares: the screen or page that
  shows one takes it in a `useRealtime<What>` hook, which writes each value into its element through
  a ref, or into local state only when the kind of state changes, so it renders again on a change of
  kind, not on every tick.

## Routing and overlays

For a web app; a desktop screen with routes of its own follows them too, with its router mechanics
in `common/`. [references/web-router.md](references/web-router.md) is the full router, every module
typechecked over React Router 7 and `history` 5 with any state library: build a new router from it,
and hold an existing one to it.

- **Routes are declared once.** One list in `config/` holds each route's path pattern and the query
  keys it accepts, grouped into zones by the access they need. Links, navigation, params, and query
  take their types from it (`/video/:id` gives `{ id: string }`), so a link to an undeclared route,
  without a param, or with an undeclared query key fails typecheck, and reading the query returns
  only the keys its route declares. The app reaches the router library only through its router
  module (`core/router/` in a web app).
- **A route is a payload.** Code above the router passes `{ path, params, query }`; only the router
  turns a payload into a URL and a location back into a payload, and a location nothing matches is
  the not-found route.
- **The router owns the history.** The app creates the one history the router library renders from.
  Every location passes the guard before any listener hears of it; a refused one is replaced, so
  Back never returns to it, and stays in the history's log as a refusal; a redirect loop is a fault.
- **One guard decides access.** It sits in `app/router/`, reads a snapshot through the getter it is
  built with, and answers `null` or the payload to go to instead, through checks whose order is the
  policy. It starts nothing, so work a redirect needs belongs to the page it lands on, and a route
  that only forwards (`/` to the person's home) is a redirect, not a page effect. A refusal and an
  unknown location are routes (`/no-access`, `/404`). The composition root registers the guard once
  the session is known, no route renders before that, and it runs the guard again on the current
  location whenever what the guard reads changes.
- **The store keeps a copy; the router navigates.** Whatever the state library, the history's change
  event updates one copy of the current route that selectors read, and every navigation goes through
  the router's hooks (`useNavigate`, and `useLeaveBlocker` for unsaved work).
- **A page names its route once** and hands it to the router's hooks, which answer typed to that
  route; off it, they throw, since the component is mounted where it does not belong. A zone's
  layout reads the owner id on every route under the zone's prefix.
- **Page state someone would share lives in the query**: the tab, filters, the open dialog, the
  selected item. Changing it replaces the location, so Back leaves the page instead of undoing each
  change; unsaved work stops navigation through one blocker hook.
- **A layout route keeps its frame.** The layout renders around an `<Outlet />` with the Suspense
  boundary inside it, so only the content waits for a page's chunk. The route table renders a zone
  the person cannot enter as the refusal page, so a guard mistake never shows the page.
- **One dialog host.** A provider at the root owns the portal. A dialog is controlled (`isOpen`,
  `onClose(result)`) and gets focus trapping and keyboard handling from the shared dialog; its
  caller owns whether it is open and what the result means.

## First load

A web app downloads before it runs, so its first paint must not wait for its code. It loads in
stages: the bootstrap entry, host setup when a host embeds it, the app entry, the mount, and the
first ready view. [references/web-build.md](references/web-build.md) spells each rule here and in
[§ Build](#build) for webpack and for Vite.

- **A shell paints before the app's code runs**, and the app hides it when its first view is ready
  or has failed for good. A shell that fits every route is static HTML and CSS in the page template.
  A shell that varies by route, and whose pieces the app reuses as loading fallbacks, is an entry of
  its own on a small React-compatible renderer (Preact).
- **The shell entry stays small.** It imports only dependency-free leaves: never the app, a model, a
  service, an SDK, or a CSS-in-JS runtime, and nothing that reads host state when it loads. Its JSX
  targets the shell's renderer, and the app shares its modules instead of bundling a second copy;
  the emitted graph shows it.
- **The page paints the shell before the app evaluates.** The template holds the shell's element and
  CSS. A dynamic import orders evaluation but does not promise a paint, so a script shell lets the
  browser paint before the bootstrap goes on, and a cold and a cached load both show the shell.
- **The shell picks its layout from the URL**, before any router exists, through one route-to-shell
  map that the app's fallbacks use too.
- **The app reuses the shell's pieces** as its Suspense fallbacks, through one bridge hook that
  renders them into a ref and unmounts them on cleanup. With the same CSS, the shell, the fallback,
  and the page line up without a jump.
- **The bootstrap entry imports the app after host setup** (`await import("./index-app")`), since a
  module that reads host state when it loads must load after the host is set up.
- **Code arrives with its page.** Each page loads behind `import()`, and so does a heavy library
  (charts, drag and drop, QR codes), through a hook (`useLazyQrCode`). Code that only lazy pages use
  is shared among them, never copied into each and never pulled into the first load; the emitted
  initial and lazy files show where it landed. A hand-made chunk group answers a measurement, never
  a habit, and the emitted files are checked again after it.
- **Nothing drags a heavy library into the first load.** A page's state (its reducers, effects, or
  models) registers when the page mounts, never in the global store at startup, where it imports
  everything the page imports. A component the first views share loads a library only for the case
  that needs it, after checking what the browser does natively (HLS plays natively in Safari).
  Analytics, session replay, and chat widgets load once the first view is idle. A workspace package
  bundled from its `dist/` counts like any library, though no `node_modules` rule catches it.
- **Code one role uses never ships to everyone.** Admin tools and a role's API entry load behind
  `import()` inside the role's lazy pages; a package exposes its role-only part as an entry of its
  own, so its main entry never brings it, and the emitted initial files hold none of it.
- **A chunk that fails to load after a deploy reloads the page once** per tab session, under a
  session flag, so an outage does not loop; any other load error surfaces.
- **An open page learns of a new release.** The build writes one release id into the bundle and,
  from the same value, into `release.json` beside the HTML, revalidated like it. A framework-free
  watcher, started once at bootstrap with its network, page, and timers behind ports, checks the
  file on an interval and whenever the page comes back into view, and announces a newer release
  once. A hidden page then reloads by itself when nothing would be lost (no active leave blocker, no
  upload in flight); a visible one offers the person a refresh.
- **Each build is measured** against the budget the repository names, on what the page loads: the
  assets the shell's paint needs, and those the first ready view needs, each counted once and
  compressed. A build over the budget fails, and a trace of a cold and a cached load of the main
  routes shows when each one paints.

## Build

For a web app; a desktop renderer loads from disk and skips caching, compression, and the deploy
rules.

- **Each runtime builds its own graph.** Browser, worker, and server code are separate graphs. A
  worker is created from `new URL("./<name>.worker.ts", import.meta.url)`, so it gets a hashed URL
  the bundler resolves; what goes in one is `code-architecture` § Work off the main thread. Only
  browser assets are published: the server bundle and source maps never sit in the served folder.
- **Asset names carry their content hash; the HTML is revalidated.** Every emitted script,
  stylesheet, and media file is named by its content hash, and a public one is cached for good
  (`immutable`); the HTML that names them is revalidated on each visit. A deploy publishes the
  assets before the HTML and keeps earlier releases' assets, across several deploys, while open
  pages may still ask for them, under one prefix shared by every release: a prefix per release gives
  every file a new URL and makes returning visitors download unchanged chunks again. Each emitted
  file sits in its kind's folder (`scripts/`, `styles/`, `images/`, `fonts/`, `media/`, `wasm/`),
  asset rules match by type rather than by folder, so a dependency's fonts emit too, and no asset is
  inlined as a data URL.
- **Public files keep stable names at the site root.** The favicon set (`favicon.ico`, an SVG icon,
  `apple-touch-icon.png`, the manifest's icons) and the web manifest live in `public/`, are copied
  as they are, linked by the page, and get a short cache, since a deploy may replace one under its
  name. One tool owns each file.
- **One build serves every deployment**: its constants and runtime settings follow
  `code-architecture` § Inputs and expensive steps, and every deployment serves its assets under the
  base path the build was made for, or the build uses relative asset URLs.
- **CSS ships with the UI that uses it**: extracted, hashed, split by chunk, and loaded with its
  view. Unused styles stay out by being imported only where used; a scan that deletes selectors it
  cannot see in the source deletes the ones code builds at run time.
- **What ships is what is used.** Production output is minified. Icons, locales, and illustrations
  are imported by literal path or a narrow glob, so the build holds only what code names, and a
  module imports what it uses: no global the bundler injects. Images come in the sizes their slots
  show.
- **An SVG is a file unless it must be a component.** A plain import is a URL for `<img>`, cached
  and never parsed as script; `?react` makes a component, cleaned by SVGO with its `viewBox` kept,
  for a small icon that takes `currentColor` or a title. An icon is never lazy on its own: a few
  kilobytes are not worth a request and a blank Suspense moment, so an icon set chosen by data loads
  as one module.
- **Chunks split by default, plus one framework chunk.** React, React DOM, and the scheduler share a
  chunk that outlives app deploys; everything else follows the bundler's own sharing. No catch-all
  vendor chunk, no `enforce` beside size settings, and deterministic production ids.
- **Compression is done once and negotiated.** Text assets above about a kilobyte are precompressed
  at build time, brotli at quality 11 and gzip at level 9, each kept only when it saves a fifth, and
  served by the request's `Accept-Encoding`. An object store negotiates nothing: its variants reach
  a browser only when the edge picks them, or else the CDN compresses within its size limits. A
  blanket `Cache-Control` set before the static files overrides their long cache.
- **Source maps stay private.** Production maps are emitted without a link in the served files,
  uploaded to the error tracker under the release, and left out of what is published; a build
  without maps leaves production errors unreadable. Development maps favour rebuild speed
  (`eval-cheap-module-source-map`), and the `'unsafe-eval'` they need stays in the development
  Content Security Policy. The server bundle keeps its map and runs with `--enable-source-maps`.
- **The bundler only strips types.** An app transpiles with swc or the bundler's own transpiler and
  emits no declarations; its targets come from the browserslist, never a fixed older target that
  rewrites `async` and `await` in every module. Type checking runs as its own step (`tsc --noEmit`,
  or a checker beside the dev server) and gates the release, so a dev rebuild never waits for it.
- **A library's own runtime files keep their names.** A URL the app hands a library (its Wasm core)
  is a `?url` import, emitted under a hashed name; files the library loads by its own relative names
  (a worker and its siblings) ship side by side in `vendor/<package>@<version>/`, cached for good,
  and the minifier leaves them as the library built them. WebAssembly needs `'wasm-unsafe-eval'` in
  the Content Security Policy, never `'unsafe-eval'`.
- **A build config reads as layers.** Its paths come first, each named once as `p<What>` (`pRoot`,
  `pSrc`, `pDist`) from the config's own folder through one `createPackagePaths`; rules and plugins
  are factories scoped once (`{ includePathsList }`) and made per mode (`{ isDev }`); a common
  config holds what targets share, each target is `merge(common, { what differs })`, and a variant
  merges the target it extends. The file exports every target as an array of named configs that
  scripts pick by name, the dev server merges the development target in a file of its own, and the
  config files are TypeScript with a tsconfig of their own. Vite says the same with `mergeConfig`
  per `--mode`.

## Mounting

Every React root mounts through one function: strict mode, the providers, and the root element. A
desktop screen mounts only after its copy holds the snapshot. A web app mounts at once behind its
shell, and a view that needs data the app does not hold yet shows its fallback. Neither shows a
placeholder default as real state.

## Styling

The repository's styling system decides the mechanism; these rules hold in any of them:

- **A style sits with the element it styles**, in the system's own way: utility classes in the
  markup, a CSS module beside the component, a styled component.
- **A style used in several places becomes a component** in `components/ui/` or `comp/ui/`
  (`Section`, `Row`, `Button`), never a shared class or mixin copied into each place (`@apply`).
- **Theme values are named for their role** (`canvas`, `control`, `ink-muted`), never a raw colour
  in a component.
- **Variants are declared once** (a variant map such as `cva`, or the system's equivalent), and
  classes that change with state or are overridden merge through one helper (with Tailwind, one
  `clsx` plus `tailwind-merge` function).

## Tests

Logic leaves components for hooks, models, and helpers, which suites test per
`code-unit-tests-architecture`; a screen's or page's behaviour is checked by a real run.

## Review checklist

- Only components and hooks are `.tsx`; component files are PascalCase, hook files are the hook.
- Each component is a `React.FC` const with its `displayName`; its props type is `Props`, or
  `<Component>Props` beside other types.
- No effect or subscription in a component file; hooks sit in their unit's `hooks/` and return
  stable values; generic hooks are function declarations.
- Components read state through the selector hook and change it through named requests; no fetch in
  a component; local state holds only what no one else needs.
- Real-time values are written through a ref in a `useRealtime<What>` hook, not through the store.
- Web app: imports point down, no concept imports `app/`, only `app/` imports the core aggregate,
  and services start at bootstrap.
- Web app: each model lives as long as its state; Suspense boundaries sit below per-mount models.
- Web app router, per [references/web-router.md](references/web-router.md): one route list in
  `config/`; payloads above the router; one history the guard gates; a guard in `app/router/` that
  only decides; the store copies the route and never navigates; shared page state in the query.
- Web app: a shell paints before the app's code; the shell entry imports only leaves; pages and
  heavy libraries load behind `import()`, with no page state registered at startup and no role-only
  code in the first load; the first load is measured, and a build over budget fails; an open page
  learns of a new release from `release.json`.
- Web app build config: `p<What>` paths named first, rule factories scoped once and made per mode,
  `merge()` layers per target, an exported array of named configs, assets in folders by kind, a
  public favicon set, and source maps per target.
- Web app build: one graph per runtime, hashed assets under revalidated HTML, build facts only in
  constants, CSS per view, private source maps, swc with browserslist targets and a separate type
  check, SVGs as files unless small icons, default chunks plus a framework chunk, and brotli and
  gzip served by negotiation.
- Styling uses the repository's system; repeated styles are `ui/` components; theme values are named
  for their role.
- Every React root mounts through the one function; every control has a label.
