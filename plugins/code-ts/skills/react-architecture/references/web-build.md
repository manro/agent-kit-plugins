# Web build

How the rules of `SKILL.md` § First load and § Build look in code, for webpack 5 and Vite 8. The app
code is the same under both; only the config and the page differ. Before Vite 8,
`build.rolldownOptions` was `build.rollupOptions` and chunk groups were `output.manualChunks`.
Imports in the examples use an alias per layer (`#base/`, `#core/`, `#skeleton/`); a repository
writes them with its own.

## What each bundler gives

| Rule                        | webpack 5                                                   | Vite 8                                                           |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Shell and app share modules | `dependOn` and `runtimeChunk: "single"`                     | Two entries in `build.rolldownOptions.input`: shared by default  |
| Shell JSX for Preact        | A `babel-loader` rule scoped to the shell folder            | `@jsxImportSource preact` per shell file; React plugin `exclude` |
| Lazy pages, shared code     | `import()`; `splitChunks` shares                            | `import()`; shared and preloaded by default                      |
| A hand-made chunk group     | `optimization.splitChunks.cacheGroups`                      | `build.rolldownOptions.output.codeSplitting.groups`              |
| Content-hashed names        | `[contenthash]` in every output and asset file name         | Default                                                          |
| HTML that names the assets  | `html-webpack-plugin` injects them into a template          | The server writes them from `build.manifest`                     |
| CSS per chunk               | `mini-css-extract-plugin`, `css-minimizer-webpack-plugin`   | Default (`build.cssCodeSplit`)                                   |
| A worker, classic           | `new Worker(new URL(…, import.meta.url))`                   | The same                                                         |
| A module worker             | The same, with `output.module`                              | The same, with `worker.format: "es"`                             |
| Build constants             | `DefinePlugin`                                              | `define`                                                         |
| Private source maps         | `devtool: "hidden-source-map"`                              | `build.sourcemap: "hidden"`                                      |
| Precompressed assets        | `compression-webpack-plugin`                                | A compression plugin (`vite-plugin-compression2`)                |
| Type check                  | `ts-loader` `transpileOnly` with a forked checker, or `tsc` | `tsc --noEmit`                                                   |
| A chunk gone after a deploy | `import()` rejects with a `ChunkLoadError`                  | `import()` rejects with the browser's module-load error          |
| What the build emitted      | `webpack --json` stats                                      | `.vite/manifest.json` and the emitted files                      |

## webpack 5 config

A fragment: the app's own TypeScript and CSS loaders and its asset rules sit beside it.

```js
// webpack.config.js
import path from "node:path";

import HtmlWebpackPlugin from "html-webpack-plugin";

export default {
  mode: "production",
  entry: {
    shell: "./src/skeleton/index-shell.ts",
    app: { import: "./src/index.ts", dependOn: "shell" }
  },
  output: {
    filename: "scripts/[name].[contenthash:8].js",
    chunkFilename: "scripts/[name].[contenthash:8].js"
  },
  resolve: { extensions: [".ts", ".tsx", "..."] },
  devtool: "hidden-source-map",
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        shell: {
          test: /[\\/](src[\\/]skeleton|node_modules[\\/]preact)[\\/]/,
          name: "shell",
          chunks: "initial",
          enforce: true
        }
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: path.resolve("src/skeleton"),
        use: {
          loader: "babel-loader",
          options: {
            babelrc: false,
            configFile: false,
            presets: ["@babel/preset-typescript"],
            plugins: [
              [
                "@babel/plugin-transform-react-jsx",
                { runtime: "automatic", importSource: "preact" }
              ]
            ]
          }
        }
      }
    ]
  },
  plugins: [new HtmlWebpackPlugin({ template: "./src/index.html" })]
};
```

- `dependOn` keeps the shell's modules out of the app's chunks, and the single runtime gives both
  entries one instance of each module, so the app imports the shell's modules.
- The `shell` cache group keeps the shell folder and Preact in the shell chunk when chunk splitting
  would otherwise move them.
- The app's own TypeScript rule excludes `src/skeleton`; `babelrc: false` and `configFile: false`
  keep the project's Babel config from adding the app's transforms to the shell.

## Vite 8 config

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react({ exclude: [/[\\/]node_modules[\\/]/, /[\\/]src[\\/]skeleton[\\/]/] })],
  build: {
    manifest: true,
    sourcemap: "hidden",
    rolldownOptions: {
      input: { shell: "src/skeleton/index-shell.ts", app: "src/index.ts" }
    }
  }
});
```

- Two inputs in one build make two entries that import the same emitted file for a module they
  share. From Vite 8.2 the top-level `input` option says the same and also reaches the dev server.
- Each shell file starts with `/** @jsxImportSource preact */`, which picks Preact's JSX for that
  file; the React plugin's `exclude` keeps Fast Refresh out of the shell.
- The first entry imports `vite/modulepreload-polyfill` when the browser target lacks module
  preload.
- The dev server serves source modules one by one, so the chunk layout is checked on a production
  build, never in dev.
- When the bootstrap's own imports are small, one `index.html` with both module scripts is enough:
  Vite bundles the two into one entry, and the app still loads behind the bootstrap's `import()`.

## The page

Each entry imports its own CSS (`import "./shell.css"` in `index-shell.ts`), so the bundler emits it
and lists it with the entry.

```html
<!-- webpack: the template; html-webpack-plugin adds the CSS and the deferred scripts -->
<body>
  <div id="shell"></div>
  <div id="root"></div>
</body>
```

```html
<!-- Vite: the server writes the tags from .vite/manifest.json, in this order -->
<head>
  <link rel="stylesheet" href="/assets/shell-[hash].css" />
  <script type="module" src="/assets/shell-[hash].js"></script>
  <link
    rel="stylesheet"
    href="/assets/[each CSS file of the app entry and its imports, once].css"
  />
  <link rel="modulepreload" href="/assets/[each static import of the app entry].js" />
  <script type="module" src="/assets/app-[hash].js"></script>
</head>
<body>
  <div id="shell"></div>
  <div id="root"></div>
</body>
```

The server walks each entry's `imports` in the manifest for its CSS and preloads, and writes a file
once even when both entries reach it. The bootstrap imports no CSS, so the app's list is usually
empty: the app's styles come with its lazy chunk. Deferred and module scripts run in order after
parsing, so the shell renders before the bootstrap starts. A static shell is markup and inline CSS
inside `#shell`, with no shell script.

## The shell

```ts
// src/skeleton/shell.ts
import { h, render } from "preact";

import { pickShell } from "./pick-shell";
import { StartErrorShell } from "./StartErrorShell.preact";

const SHELL_ELEMENT_ID = "shell";

export const showShell = (): void => {
  const node = document.getElementById(SHELL_ELEMENT_ID);
  if (node) render(h(pickShell(location.pathname), {}), node);
};

export const showStartError = (): void => {
  const node = document.getElementById(SHELL_ELEMENT_ID);
  if (node) render(h(StartErrorShell, {}), node);
};

export const hideShell = (): void => {
  const node = document.getElementById(SHELL_ELEMENT_ID);
  if (!node) return;
  render(null, node);
  node.remove();
};
```

```ts
// src/skeleton/index-shell.ts
import "./shell.css";

import { showShell } from "./shell";

showShell();
```

```ts
// src/skeleton/pick-shell.ts
import type { FunctionComponent } from "preact";

import { DefaultShell } from "./DefaultShell.preact";
import { LibraryShell } from "./LibraryShell.preact";
import { VideoShell } from "./VideoShell.preact";

type ShellComponent = FunctionComponent;

const SHELL_BY_ROUTE: ReadonlyArray<readonly [RegExp, ShellComponent]> = [
  [/^\/video\/[^/]+$/, VideoShell],
  [/^\/library(\/|$)/, LibraryShell]
];

export const pickShell = (pathname: string): ShellComponent =>
  SHELL_BY_ROUTE.find(([pattern]) => pattern.test(pathname))?.[1] ?? DefaultShell;
```

A shell component is `<Name>.preact.tsx` and starts with `/** @jsxImportSource preact */`, so the
app's typecheck reads its JSX as Preact's. A lint region over `src/skeleton/**` bans `react`,
`react-dom`, the app, the core, and any CSS-in-JS runtime. The route patterns follow the route list:
when that list is a dependency-free module the shell imports it; otherwise a suite checks that every
declared route picks the shell it should.

With a static shell, `shell.ts` holds the same three functions as DOM operations on `#shell`
(`showStartError` swaps in an error message, `hideShell` removes the element), and no Preact loads.

## Shell pieces as app fallbacks

```tsx
// src/base/useShellPiece.tsx
import { render, type VNode } from "preact";
import { useLayoutEffect, useRef } from "react";

/** Renders a shell piece into the returned ref's element until the caller unmounts. */
export const useShellPiece = (piece: VNode): React.RefObject<HTMLDivElement | null> => {
  const nodeRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = nodeRef.current;
    if (!node) return;
    render(piece, node);
    return () => render(null, node);
  }, [piece]);

  return nodeRef;
};
```

```tsx
// src/app/comp/ui/PageFallback.tsx
import { h } from "preact";
import { useMemo } from "react";

import { useShellPiece } from "#base/useShellPiece";
import { useCurrentPath } from "#core/router/useCurrentPath";
import { pickShell } from "#skeleton/pick-shell";

export const PageFallback: React.FC = () => {
  const ShellPiece = pickShell(useCurrentPath());
  const piece = useMemo(() => h(ShellPiece, {}), [ShellPiece]);
  const nodeRef = useShellPiece(piece);

  return <div ref={nodeRef} />;
};

PageFallback.displayName = "PageFallback";
```

The path comes from the router, so a fallback that stays up across a navigation follows it, and the
piece is memoized by the shell it picks, or every render would mount it again.

## Bootstrap and handoff

```ts
// src/index.ts
import { startLogger } from "#base/start-logger";
import { showStartError } from "#skeleton/shell";

import { loadChunk } from "./app/load-chunk";
import { setUpHost } from "./app/set-up-host";

/** Gives the browser one chance to paint; resolves at once in a hidden tab, which never paints. */
const waitForPaint = (): Promise<void> =>
  new Promise(resolve => {
    if (document.visibilityState === "hidden") {
      resolve();
      return;
    }
    const finish = (): void => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("visibilitychange", finish);
      resolve();
    };
    document.addEventListener("visibilitychange", finish);
    const frameId = requestAnimationFrame(() => setTimeout(finish));
  });

const startApp = async (): Promise<void> => {
  await waitForPaint();
  await setUpHost();
  const { mountApp } = await loadChunk(() => import("./index-app"));
  mountApp();
};

startApp().catch((error: unknown) => {
  startLogger.error("App start failed", { error });
  showStartError();
});
```

A frame callback runs before the browser renders and a timer set inside it runs after, so the app
evaluates once the browser has had its chance to paint the shell; a trace confirms the paint. A tab
hidden before the frame never renders, so it starts at once. An app with no host drops `setUpHost`.

```tsx
// src/app/useShellHandoff.tsx
import { useEffect } from "react";

import { hideShell } from "#skeleton/shell";

/** Hides the shell once the first view has committed, ready or failed for good. */
export const useShellHandoff = (startStatus: "starting" | "ready" | "failed"): void => {
  useEffect(() => {
    if (startStatus !== "starting") hideShell();
  }, [startStatus]);
};
```

## Lazy chunks and a deploy

Every lazy import goes through `loadChunk`, under either bundler.

```ts
// src/app/load-chunk.ts
const RELOAD_FLAG_KEY = "chunk-reload";
const MODULE_LOAD_MESSAGE_PREFIXES = [
  "Failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "Importing a module script failed",
  "Loading CSS chunk",
  "Unable to preload CSS"
];

/** A file that failed to arrive, as the browsers word it: a reload can fix it. */
const isChunkLoadError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.name === "ChunkLoadError" ||
    MODULE_LOAD_MESSAGE_PREFIXES.some(prefix => error.message.startsWith(prefix)));

/** True the first time this tab asks; false after that, or when storage is unavailable. */
const markReloadOnce = (): boolean => {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG_KEY)) return false;
    sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
    return true;
  } catch {
    return false;
  }
};

/** Loads a chunk; when its file is gone, as after a deploy, reloads the page once per tab. */
export function loadChunk<T>(load: () => Promise<T>): Promise<T> {
  return load().catch((error: unknown) => {
    if (!isChunkLoadError(error) || !markReloadOnce()) throw error;
    location.reload();
    return new Promise<T>(() => {});
  });
}
```

```ts
const SettingsPage = lazy(() =>
  loadChunk(() => import("./pages/settings/SettingsPage")).then(module => ({
    default: module.SettingsPage
  }))
);
```

- webpack names a failed script fetch `ChunkLoadError`, and `mini-css-extract-plugin` a failed
  stylesheet `Loading CSS chunk … failed`; under Vite the browser's own module-load error and Vite's
  `Unable to preload CSS` arrive (Chromium, Firefox, and Safari each word the first differently).
  Any of them may mean the release changed; anything else rejects as it came. Matching by message is
  a heuristic, so a test per target browser checks the messages; a wrong match costs one reload,
  since the flag holds for the tab.
- The flag stays for the tab session, so a chunk that stays broken reloads once, not on every visit,
  and the pending promise keeps the fallback up while the page reloads.
- Nothing calls `preventDefault()` on Vite's `vite:preloadError`: that turns the failed import into
  one that resolves to `undefined`.

A hand-made chunk group, added after a measurement showed a library copied into several lazy chunks,
or loaded where it is not used:

```js
// webpack: optimization.splitChunks.cacheGroups
const cacheGroups = {
  markdown: {
    name: "shared-markdown",
    chunks: "async",
    minChunks: 2,
    reuseExistingChunk: true,
    test: /[\\/]node_modules[\\/](remark-|rehype-|micromark)/
  }
};
```

```ts
// Vite: build.rolldownOptions.output.codeSplitting
const codeSplitting = {
  groups: [
    {
      name: "shared-markdown",
      test: /[\\/]node_modules[\\/](remark-|rehype-|micromark)/,
      minShareCount: 2
    }
  ]
};
```

Neither group guarantees the result: webpack skips a group below its split thresholds, and
Rolldown's `minShareCount` counts entries, so a match can pull in initial code. The emitted initial
and lazy files are checked again after adding one. A catch-all vendor chunk is no goal: any
dependency bump changes it, and every page loads all of it.

## Workers

When a worker is worth it and how its owner drives it: `code-architecture` § Work off the main
thread.

```ts
const createTimerWorker = (): Worker => new Worker(new URL("./timer.worker.ts", import.meta.url));
```

Both bundlers build the worker as its own graph and name it by its hash, as a classic worker by
default. A module worker (`{ type: "module" }`) also needs module output: `output.module` in
webpack, which otherwise drops the type, or `worker.format: "es"` in Vite. A worklet, which
`addModule()` loads by URL, is built as its own ES module entry; webpack 5.109 and later also parse
`addModule(new URL(…))`.

## Serving and deploying

| What                                              | `Cache-Control`                                |
| ------------------------------------------------- | ---------------------------------------------- |
| A hashed public script, stylesheet, or media file | `public, max-age=31536000, immutable`          |
| The HTML                                          | `no-cache`, plus `private` when it is personal |
| A file with a stable public name                  | A short `max-age`                              |

- A deploy uploads the new assets, then switches the HTML, and keeps earlier releases' assets as
  long as an open page may still ask for them, across several deploys.
- A precompressed `.br` or `.gz` file is served for the request's `Accept-Encoding`, honouring its
  weights, with `Content-Encoding` naming the encoding, the original `Content-Type`, and
  `Vary: Accept-Encoding`; the plain file goes to a client that takes neither, unless it also rules
  out `identity`, which gets a 406. Precompress only what gains: above a few kilobytes, and to at
  most about 80 % of its size.
- The release step uploads the hidden source maps to the error tracker under the release id, then
  publishes from an allowlist that leaves maps out.

## Measuring

A script reads what the build emitted (webpack's stats, or Vite's manifest and output folder) and
counts two sets, each file once and gzipped: the shell's paint (the runtime, the shell's script, its
CSS) and the first ready view (those, the app's initial scripts and CSS, and the first route's lazy
files). webpack's `performance` hints check each entry's raw bytes alone, so they miss what two
entries share and what loads after the entry. A browser trace of a cold and a cached load of the
main routes adds when each set paints.
