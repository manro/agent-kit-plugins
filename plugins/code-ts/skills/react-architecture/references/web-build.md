# Web build

How the rules of `SKILL.md` § First load and § Build look in code, for webpack 5 and Vite 8. The app
code is the same under both; only the config and the page differ. Before Vite 8,
`build.rolldownOptions` was `build.rollupOptions` and chunk groups were `output.manualChunks`.
Imports in the examples use an alias per layer (`#base/`, `#core/`, `#skeleton/`); a repository
writes them with its own.

## What each bundler gives

| Rule                        | webpack 5                                                    | Vite 8                                                              |
| --------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| Shell and app share modules | `dependOn` and `runtimeChunk: "single"`                      | Two entries in `build.rolldownOptions.input`: shared by default     |
| Shell JSX for Preact        | A `babel-loader` rule scoped to the shell folder             | `@jsxImportSource preact` per shell file; React plugin `exclude`    |
| Lazy pages, shared code     | `import()`; `splitChunks` shares                             | `import()`; shared and preloaded by default                         |
| A hand-made chunk group     | `optimization.splitChunks.cacheGroups`                       | `build.rolldownOptions.output.codeSplitting.groups`                 |
| Content-hashed names        | `[name].[contenthash:8]` in every output and asset file name | `[name].[hash]` on entries, chunks, and assets (default `-`)        |
| HTML that names the assets  | `html-webpack-plugin` injects them into a template           | Vite writes them into `index.html`; a server reads `build.manifest` |
| CSS per chunk               | `mini-css-extract-plugin`, `css-minimizer-webpack-plugin`    | Default (`build.cssCodeSplit`)                                      |
| A worker, classic           | `new Worker(new URL(…, import.meta.url))`                    | The same                                                            |
| A module worker             | The same, with `output.module`                               | The same, with `worker.format: "es"`                                |
| Build constants             | `DefinePlugin`                                               | `define`                                                            |
| Private source maps         | `devtool: "hidden-source-map"`                               | `build.sourcemap: "hidden"`                                         |
| Precompressed assets        | `compression-webpack-plugin`, or the release-step script     | The release-step script (`scripts/compress-assets.mjs`)             |
| Transpile                   | `swc-loader`: types stripped, targets from browserslist      | Built in (Oxc); `build.target`                                      |
| Type check                  | A forked checker beside the dev server; `tsc --noEmit` in CI | `tsc --noEmit`                                                      |
| Minify                      | `TerserPlugin.swcMinify`, `css-minimizer-webpack-plugin`     | Default                                                             |
| SVG as a component          | `@svgr/webpack` on `?react`                                  | `vite-plugin-svgr` on `?react`                                      |
| One React copy              | `resolve.alias`                                              | `resolve.dedupe`                                                    |
| Rebuild cache               | `cache: { type: "filesystem" }`                              | Prebundled dependencies, by default                                 |
| A budget that fails a build | `performance.hints: "error"`, plus the measuring script      | The measuring script (`chunkSizeWarningLimit` only warns)           |
| A chunk gone after a deploy | `import()` rejects with a `ChunkLoadError`                   | `import()` rejects with the browser's module-load error             |
| Layers and targets          | `merge()` per target; an exported array; `--config-name`     | `mergeConfig` per `--mode`; the server in its own config file       |
| Parts                       | Rule factories scoped once, made per mode                    | Plugin factories                                                    |
| Files by kind               | `generator.filename` per asset rule                          | An `assetFileNames` function                                        |
| No data URLs                | `asset/resource`                                             | `assetsInlineLimit: 0`                                              |
| Public files                | `copy-webpack-plugin`                                        | `publicDir`                                                         |
| Release id and file         | `DefinePlugin` and a `processAssets` plugin                  | `define` and `generateBundle` in one plugin                         |
| Library runtime files       | `createRuleLibraryRuntime`, an asset rule                    | `createLibraryRuntimePlugin`, a `load` hook                         |
| Server build                | A `target: "node"` config in the array, ES module output     | `build.ssr` in its own config, `publicDir: false`                   |
| What the build emitted      | `webpack --json` stats                                       | `.vite/manifest.json` and the emitted files                         |

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

## webpack 5 production config

A build config is read far more often than it changes, so it reads as layers: the paths, then the
parts, then one layer per target. The files below build a fixture app's client in development,
production, and a profiling variant, and its server, from one exported array.

- **Paths first, named once.** `webpack.paths.ts` resolves every path from the config's own folder
  (`import.meta.dirname`, never the working directory) through `createPackagePaths`, and names each
  one `p<What>`: `pRoot`, `pSrc`, `pDist`, `pBuild`, `pModules`, then the ones the targets read
  (`pClientEntry`, `pClientDist`). A bundler config spells its paths this way (`code-standards` §
  Names); nothing below calls `path.resolve` inline.
- **Rules and plugins are factories, scoped once and made per mode.**
  `const clientRuleSwc = createRuleSwc({ includePathsList: [pSrc] })` fixes what a rule reads and
  names it after the runtime it serves (`clientRuleSwc`, `serverRuleSwc`); the function it returns
  takes `{ isDev }`, so each target makes the same rule for its mode, and no copy of a rule drifts.
  `include` alone scopes a rule; `exclude` only carves a folder out of what `include` holds. Scripts
  are scoped to the sources, so no transpiler reads `node_modules`; stylesheets and asset files are
  not, since a dependency's stylesheet brings its own fonts. A factory shared by several apps takes
  a plugin's loader as a parameter (`MiniCssExtractPlugin.loader`), so each app keeps its own plugin
  version.
- **Every target is a layer.** `clientCommon` holds what every client build shares; a target is
  `merge(clientCommon, { … })` and states only what differs, and a variant merges the target it
  extends (`merge(clientDist, { … })`). `webpack-merge` appends arrays (rules, plugins) and merges
  objects, so a layer adds a plugin without restating the rest; `mergeWithRules` changes one rule's
  options in place, matched by `test` and loader.
- **The file exports every target as an array of named configs.** A script picks targets by name,
  and several names build in one process; separate processes are for a build that needs a process's
  whole memory. The dev server is its own file that merges the development target.
- **The configs are TypeScript with their own tsconfig**, which lists the config files and the
  server. webpack-cli loads a `.ts` config through `ts-node` (it must be installed; under
  `"type": "module"` Node itself then strips the types).

```ts
// webpack.paths.ts: every path the build reads or writes, named once, from the package root.
import path from "node:path";

// Each runtime's folder, under the sources and under each output.
const CLIENT_DIR_NAME = "client";
const SERVER_DIR_NAME = "server";

/** The folders every package has, from its root. */
export function createPackagePaths(pPackageRoot: string) {
  return {
    pSrc: path.resolve(pPackageRoot, "src"),
    pDist: path.resolve(pPackageRoot, "dist"),
    pBuild: path.resolve(pPackageRoot, "build"),
    pModules: path.resolve(pPackageRoot, "node_modules")
  };
}

// The config's own folder, not the working one: a build started anywhere resolves the same.
export const pRoot = import.meta.dirname;
export const { pSrc, pDist, pBuild, pModules } = createPackagePaths(pRoot);

export const pAssets = path.resolve(pSrc, "assets");
export const pServer = path.resolve(pRoot, SERVER_DIR_NAME);
// Files served as they are, under stable names at the site root: the icons and the manifest.
export const pPublic = path.resolve(pRoot, "public");

export const pClientEntry = path.resolve(pSrc, "index.tsx");
export const pIndexHtml = path.resolve(pSrc, "index.html");
export const pServerEntry = path.resolve(pServer, "index.ts");

export const pClientDist = path.resolve(pDist, CLIENT_DIR_NAME);
export const pClientBuild = path.resolve(pBuild, CLIENT_DIR_NAME);
export const pServerDist = path.resolve(pDist, SERVER_DIR_NAME);

// The files that shape the build: a change to one invalidates the filesystem cache.
export const pConfigFilesList = ["webpack.paths.ts", "webpack.parts.ts", "webpack.config.ts"].map(
  fileName => path.resolve(pRoot, fileName)
);
```

```ts
// webpack.parts.ts: rules and plugins, each scoped once and made per mode.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import browserslist from "browserslist";
import CompressionPlugin from "compression-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";
import CssMinimizerPlugin from "css-minimizer-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import TerserPlugin from "terser-webpack-plugin";
import webpack, { type Compiler, type RuleSetRule, type WebpackPluginInstance } from "webpack";

import { pModules, pPublic, pRoot } from "./webpack.paths.ts";

type RuleScope = { includePathsList: string[] };
type RuleMode = { isDev: boolean };

const SCRIPT_PATTERN = /\.[cm]?[jt]sx?$/;
// Text worth compressing; images, video, and woff2 are compressed already.
const COMPRESSIBLE_PATTERN = /\.(js|mjs|css|html|svg|json|wasm|txt|xml|ttf|otf)$/;
// Under about a kilobyte a response fits the same packets compressed or not.
const COMPRESS_MIN_BYTES = 1024;
// The folder that holds the files libraries load by their own relative names.
const VENDOR_FOLDER_PATTERN = /^vendor\//;
// A content hash names every emitted file, so a host caches it for good.
export const HASHED_NAME = "[name].[contenthash:8]";
// Each kind of file gets its own folder: a host gives a kind its own headers (a font fetched from
// another origin needs CORS), and a reader sees what a build ships.
const ASSET_FOLDER_PATTERNS_MAP = {
  images: /\.(png|jpe?g|gif|webp|avif|ico)$/i,
  fonts: /\.(woff2?|ttf|otf)$/i,
  media: /\.(mp3|mp4|webm)$/i,
  wasm: /\.wasm$/i
} as const;

const browserTargetsList = browserslist.loadConfig({ path: pRoot }) ?? ["defaults"];

/** TypeScript and TSX through swc: types stripped, syntax kept for the browserslist targets. */
export const createRuleSwc =
  ({ includePathsList }: RuleScope) =>
  ({ isDev }: RuleMode): RuleSetRule => ({
    test: SCRIPT_PATTERN,
    include: includePathsList,
    use: [
      {
        loader: "swc-loader",
        options: {
          swcrc: false,
          env: { targets: browserTargetsList },
          jsc: {
            parser: { syntax: "typescript", tsx: true },
            transform: { react: { runtime: "automatic", development: isDev, refresh: isDev } }
          }
        }
      }
    ]
  });

/** `?react` makes a component, cleaned by SVGO with its viewBox kept; script imports only. */
export const createRuleSvgComponent =
  ({ includePathsList }: RuleScope) =>
  (): RuleSetRule => ({
    test: /\.svg$/i,
    resourceQuery: /react/,
    issuer: SCRIPT_PATTERN,
    include: includePathsList,
    use: [
      {
        loader: "@svgr/webpack",
        options: {
          titleProp: true,
          svgoConfig: {
            plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }]
          }
        }
      }
    ]
  });

/**
 * Every other asset is a hashed file in its kind's folder: SVG without `?react`, images, fonts,
 * media, Wasm. Not scoped to the sources: a dependency's stylesheet brings its own fonts.
 */
export const createAssetFileRulesList = (): RuleSetRule[] => [
  {
    test: /\.svg$/i,
    resourceQuery: { not: [/react/] },
    type: "asset/resource",
    generator: { filename: `images/${HASHED_NAME}[ext]` }
  },
  ...Object.entries(ASSET_FOLDER_PATTERNS_MAP).map(([folderName, filePattern]) => ({
    test: filePattern,
    type: "asset/resource" as const,
    generator: { filename: `${folderName}/${HASHED_NAME}[ext]` }
  }))
];

/** CSS injected by style tags in development, extracted per chunk in production. */
export const createRuleCss =
  ({ includePathsList }: RuleScope) =>
  ({ isDev }: RuleMode): RuleSetRule => ({
    test: /\.css$/i,
    include: includePathsList,
    use: [isDev ? "style-loader" : MiniCssExtractPlugin.loader, "css-loader"]
  });

/** The public folder's files, copied as they are to the site root under their stable names. */
export const createPublicFilesPlugin = (): WebpackPluginInstance =>
  new CopyPlugin({ patterns: [{ from: pPublic }] });

export const createMinimizersList = (): WebpackPluginInstance[] => [
  // A library's own runtime files ship as the library built them: they are ES modules the
  // minifier would read as scripts, and nothing here owns their code.
  new TerserPlugin({
    minify: TerserPlugin.swcMinify,
    extractComments: false,
    exclude: VENDOR_FOLDER_PATTERN
  }),
  new CssMinimizerPlugin()
];

/** Brotli 11 and gzip 9, written once, kept only when they save a fifth. */
export const createCompressionPluginsList = (): WebpackPluginInstance[] => [
  new CompressionPlugin<zlib.BrotliOptions>({
    filename: "[path][base].br",
    algorithm: "brotliCompress",
    compressionOptions: { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } },
    test: COMPRESSIBLE_PATTERN,
    threshold: COMPRESS_MIN_BYTES,
    minRatio: 0.8
  }),
  new CompressionPlugin({
    filename: "[path][base].gz",
    algorithm: "gzip",
    compressionOptions: { level: 9 },
    test: COMPRESSIBLE_PATTERN,
    threshold: COMPRESS_MIN_BYTES,
    minRatio: 0.8
  })
];

// =================
// RELEASE

// The file a running page polls to learn that a newer release is out.
const RELEASE_FILE_NAME = "release.json";
// What development defines: no release to compare against, so the watcher stays off.
export const DEVELOPMENT_RELEASE_ID = "development";

/** One id per release: the commit CI builds, or else the moment of this build. */
export const RELEASE_ID = process.env.RELEASE_ID ?? new Date().toISOString();

/** Writes `release.json` at the site root from the same id the bundle carries. */
class ReleaseFilePlugin {
  readonly #releaseId: string;

  constructor({ releaseId }: Readonly<{ releaseId: string }>) {
    this.#releaseId = releaseId;
  }

  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(ReleaseFilePlugin.name, compilation => {
      compilation.hooks.processAssets.tap(
        {
          name: ReleaseFilePlugin.name,
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        () => {
          const releaseText = `${JSON.stringify({ releaseId: this.#releaseId })}\n`;

          compilation.emitAsset(RELEASE_FILE_NAME, new webpack.sources.RawSource(releaseText));
        }
      );
    });
  }
}

/** The release id as a build constant, and the file that announces it: one value, one build. */
export const createReleasePluginsList = ({
  releaseId
}: Readonly<{ releaseId: string }>): WebpackPluginInstance[] => [
  new webpack.DefinePlugin({ __RELEASE_ID__: JSON.stringify(releaseId) }),
  new ReleaseFilePlugin({ releaseId })
];

// =================
// LIBRARY RUNTIME FILES

/** A dependency's version, read from its own manifest. */
function readPackageVersion(packageName: string): string {
  const manifestText = fs.readFileSync(path.join(pModules, packageName, "package.json"), "utf8");
  const manifestMap: { version?: unknown } = JSON.parse(manifestText);

  return typeof manifestMap.version === "string" ? manifestMap.version : "0.0.0";
}

/**
 * The files a library loads by its own relative names (a worker that imports `./const.js`), asked
 * for with `?url`: each keeps its name beside its siblings, in a folder named for the package and
 * its version, so the relative imports resolve and an upgrade gets a new URL.
 */
export const createRuleLibraryRuntime = ({
  packageName,
  runtimeFilePattern
}: Readonly<{ packageName: string; runtimeFilePattern: RegExp }>): RuleSetRule => ({
  test: runtimeFilePattern,
  resourceQuery: /url/,
  type: "asset/resource",
  generator: { filename: `vendor/${packageName}@${readPackageVersion(packageName)}/[name][ext]` }
});
```

```ts
// webpack.config.ts: every build target, each one a layer merged onto the one it extends.
import ReactRefreshPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import type { Configuration } from "webpack";
import { merge } from "webpack-merge";

import {
  createAssetFileRulesList,
  createCompressionPluginsList,
  createMinimizersList,
  createPublicFilesPlugin,
  createReleasePluginsList,
  createRuleCss,
  createRuleLibraryRuntime,
  createRuleSvgComponent,
  createRuleSwc,
  DEVELOPMENT_RELEASE_ID,
  HASHED_NAME,
  RELEASE_ID
} from "./webpack.parts.ts";
import {
  pClientBuild,
  pClientDist,
  pClientEntry,
  pConfigFilesList,
  pDist,
  pIndexHtml,
  pModules,
  pServer,
  pServerDist,
  pServerEntry,
  pSrc
} from "./webpack.paths.ts";

// The emitted HTML, its scripts and styles, before compression: the first-load budget.
const ENTRY_BUDGET_BYTES = 300 * 1024;

// Rules scoped once; each target makes them for its mode.
const clientRuleSwc = createRuleSwc({ includePathsList: [pSrc] });
// A dependency's stylesheet is read too; only scripts stay scoped to the sources.
const clientRuleCss = createRuleCss({ includePathsList: [pSrc, pModules] });
const clientRuleSvgComponent = createRuleSvgComponent({ includePathsList: [pSrc] });
const serverRuleSwc = createRuleSwc({ includePathsList: [pServer] });

// =================
// CLIENT

/** What every client build shares: the entry, resolution, assets, the HTML, and the chunks. */
const clientCommon: Configuration = {
  target: "browserslist",
  entry: { app: pClientEntry },
  resolve: { extensions: [".ts", ".tsx", "..."] },
  output: { assetModuleFilename: `assets/${HASHED_NAME}[ext]` },
  module: {
    rules: [
      clientRuleSvgComponent(),
      ...createAssetFileRulesList(),
      createRuleLibraryRuntime({
        packageName: "wasm-engine",
        runtimeFilePattern: /[\\/]wasm-engine[\\/]dist[\\/]esm[\\/][^\\/]+\.js$/
      })
    ]
  },
  optimization: {
    runtimeChunk: "single",
    splitChunks: {
      chunks: "all",
      cacheGroups: {
        // Changes only when React does, so it stays cached across app deploys.
        framework: {
          name: "framework",
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          chunks: "all",
          priority: 40,
          enforce: true
        }
      }
    }
  },
  plugins: [new HtmlWebpackPlugin({ template: pIndexHtml }), createPublicFilesPlugin()]
};

/** Development: fast rebuilds, React Refresh, readable names, a cache that survives restarts. */
export const clientBuild = merge(clientCommon, {
  name: "clientBuild",
  mode: "development",
  devtool: "eval-cheap-module-source-map",
  cache: { type: "filesystem", buildDependencies: { config: pConfigFilesList } },
  output: { path: pClientBuild, filename: "scripts/[name].js", clean: true },
  module: { rules: [clientRuleSwc({ isDev: true }), clientRuleCss({ isDev: true })] },
  plugins: [
    new ReactRefreshPlugin(),
    ...createReleasePluginsList({ releaseId: DEVELOPMENT_RELEASE_ID })
  ]
});

/** Production: hashed names, minified, private maps, a budget that fails the build, compressed. */
export const clientDist = merge(clientCommon, {
  name: "clientDist",
  mode: "production",
  devtool: "hidden-source-map",
  output: {
    path: pClientDist,
    filename: `scripts/${HASHED_NAME}.js`,
    chunkFilename: `scripts/${HASHED_NAME}.js`,
    clean: true
  },
  module: { rules: [clientRuleSwc({ isDev: false }), clientRuleCss({ isDev: false })] },
  optimization: { minimizer: createMinimizersList() },
  performance: {
    hints: "error",
    maxEntrypointSize: ENTRY_BUDGET_BYTES,
    maxAssetSize: ENTRY_BUDGET_BYTES
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: `styles/${HASHED_NAME}.css`,
      chunkFilename: `styles/${HASHED_NAME}.css`
    }),
    ...createReleasePluginsList({ releaseId: RELEASE_ID }),
    ...createCompressionPluginsList()
  ]
});

/** The production build with timings per module, for `webpack --json` and an analyzer. */
export const clientDistProfile = merge(clientDist, {
  name: "clientDistProfile",
  profile: true,
  output: { path: `${pDist}/client-profile` }
});

// =================
// SERVER

/** The app's server for Node: bundled, unminified, no hashes, never published with the client. */
export const serverDist: Configuration = {
  name: "serverDist",
  mode: "production",
  target: "node",
  // Maps beside the bundle, read by `node --enable-source-maps`; the server folder is never served.
  devtool: "source-map",
  entry: { server: pServerEntry },
  output: {
    path: pServerDist,
    filename: "[name].mjs",
    module: true,
    chunkFormat: "module",
    clean: true
  },
  experiments: { outputModule: true },
  // express loads view engines by a computed require; the server renders no views.
  ignoreWarnings: [{ module: /[\\/]express[\\/]lib[\\/]view\.js$/ }],
  resolve: { extensions: [".ts", "..."] },
  module: { rules: [serverRuleSwc({ isDev: false })] },
  optimization: { minimize: false }
};

export default [clientBuild, clientDist, clientDistProfile, serverDist];
```

```ts
// webpack.config.dev.server.ts: the development build behind a hot-reloading server.
import type { Configuration } from "webpack";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";
import { merge } from "webpack-merge";

import { clientBuild } from "./webpack.config.ts";
import { pClientBuild } from "./webpack.paths.ts";

const devServer: DevServerConfiguration = {
  hot: true,
  port: 3000,
  historyApiFallback: { index: "/index.html" },
  static: { directory: pClientBuild },
  client: { overlay: true }
};

export default merge<Configuration>(clientBuild, {
  name: "clientDevServer",
  devServer,
  watchOptions: { ignored: ["**/node_modules/**", "**/dist/**", "**/build/**"] }
});
```

```jsonc
// package.json
{
  "scripts": {
    "dev": "webpack serve --config webpack.config.dev.server.ts",
    "build": "webpack --config-name clientDist --config-name serverDist",
    "build:profile": "webpack --config-name clientDistProfile --json > stats.json",
    "start": "node --enable-source-maps dist/server/server.mjs"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "files": [
    "webpack.paths.ts",
    "webpack.parts.ts",
    "webpack.config.ts",
    "webpack.config.dev.server.ts",
    "server/static-files.ts",
    "server/index.ts"
  ]
}
```

- **swc transpiles and only strips types**, with targets from the package's browserslist
  ([§ Transpile and minify](#transpile-and-minify)); development turns on React Refresh, whose
  runtime the plugin injects even without a dev server, so the development target runs alone.
- **SVG has two rules**: `?react` makes a component, anything else is a hashed file
  ([§ SVG assets](#svg-assets)).
- **Splitting stays default** but for one `framework` group ([§ Chunks](#chunks)).
- **`performance.hints: "error"` fails the build** when the entry outgrows the budget: a cheap first
  gate before [§ Measuring](#measuring).
- **`hidden-source-map`** emits maps without a link in the served files.
- **Compression runs once, brotli 11 and gzip 9**, over text assets above a kilobyte
  ([§ Compression](#compression)).
- **The server builds as an ES module** (`output.module`, `experiments.outputModule`): in a
  `"type": "module"` package, a CommonJS bundle named `.js` fails at its first `require`.
  `import.meta.dirname` stays a run-time value, so the server finds `dist/client` beside its own
  folder. A dependency's known computed `require` (express's view loader) is silenced for that
  module alone with `ignoreWarnings`, never for every module with `exprContextCritical: false`.

## Vite 8 production config

The same layers in Vite's terms, built over the same fixture app with Vite 8.3 and Rolldown 1.2: the
same `p<What>` paths (`vite.paths.ts` is `webpack.paths.ts` without the cache's file list), plugin
factories in place of rule factories, and `mergeConfig` merging one layer onto another. Vite builds
one config per run, so the client's targets are modes picked by `--mode`, and the server is a config
file of its own.

```ts
// vite.parts.ts: the plugins and naming every mode shares, each made once.
import fs from "node:fs";
import path from "node:path";

import type { Plugin } from "vite";
import svgr from "vite-plugin-svgr";

import { pModules } from "./vite.paths.ts";

// Each kind of file gets its own folder: a host gives a kind its own headers (a font fetched from
// another origin needs CORS), and a reader sees what a build ships.
const ASSET_FOLDER_PATTERNS_MAP = {
  styles: /\.css$/i,
  images: /\.(svg|png|jpe?g|gif|webp|avif|ico)$/i,
  fonts: /\.(woff2?|ttf|otf)$/i,
  media: /\.(mp3|mp4|webm)$/i,
  wasm: /\.wasm$/i
} as const;

// The file a running page polls to learn that a newer release is out.
const RELEASE_FILE_NAME = "release.json";
// What development defines: no release to compare against, so the watcher stays off.
export const DEVELOPMENT_RELEASE_ID = "development";

/** One id per release: the commit CI builds, or else the moment of this build. */
export const RELEASE_ID = process.env.RELEASE_ID ?? new Date().toISOString();

/** @external Rolldown's description of an asset it emits. */
type EmittedAsset = { names: string[] };

/** `<kind>/<name>.<hash><ext>`, the kind read from the emitted file's extension. */
export function getAssetFileName({ names: fileNamesList }: EmittedAsset): string {
  const fileName = fileNamesList[0] ?? "";
  const folderEntry = Object.entries(ASSET_FOLDER_PATTERNS_MAP).find(([, filePattern]) =>
    filePattern.test(fileName)
  );

  return `${folderEntry?.[0] ?? "assets"}/[name].[hash][extname]`;
}

/** `?react` makes a component, cleaned by SVGO with its viewBox kept; a plain import is a URL. */
export const createSvgComponentPlugin = (): Plugin =>
  svgr({
    include: "**/*.svg?react",
    svgrOptions: {
      plugins: ["@svgr/plugin-svgo", "@svgr/plugin-jsx"],
      titleProp: true,
      svgoConfig: {
        plugins: [{ name: "preset-default", params: { overrides: { removeViewBox: false } } }]
      }
    }
  });

/** The release id as a build constant, and `release.json` from the same value. */
export function createReleasePlugin(releaseId: string): Plugin {
  return {
    name: "release-file",
    config: () => ({ define: { __RELEASE_ID__: JSON.stringify(releaseId) } }),
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: RELEASE_FILE_NAME,
        source: `${JSON.stringify({ releaseId })}\n`
      });
    }
  };
}

/** A dependency's version, read from its own manifest. */
function readPackageVersion(packageName: string): string {
  const manifestText = fs.readFileSync(path.join(pModules, packageName, "package.json"), "utf8");
  const manifestMap: { version?: unknown } = JSON.parse(manifestText);

  return typeof manifestMap.version === "string" ? manifestMap.version : "0.0.0";
}

/**
 * The files a library loads by its own relative names, asked for with `?url`: each keeps its name
 * beside its siblings in `vendor/<package>@<version>/`, where Vite's own `?url` would hash it.
 * Development serves them from the package folder, where the names already hold.
 */
export function createLibraryRuntimePlugin({
  packageName,
  runtimeFilePattern
}: Readonly<{ packageName: string; runtimeFilePattern: RegExp }>): Plugin {
  const vendorFolderName = `vendor/${packageName}@${readPackageVersion(packageName)}`;

  return {
    name: "library-runtime",
    apply: "build",
    enforce: "pre",
    load(moduleId) {
      const [filePath = "", queryText] = moduleId.split("?");

      if (queryText !== "url" || !runtimeFilePattern.test(filePath)) {
        return null;
      }

      const referenceId = this.emitFile({
        type: "asset",
        fileName: `${vendorFolderName}/${path.basename(filePath)}`,
        source: fs.readFileSync(filePath)
      });

      return `export default import.meta.ROLLUP_FILE_URL_${referenceId};`;
    }
  };
}
```

```ts
// vite.config.ts: every client mode, each one a layer merged onto the one it extends.
import react from "@vitejs/plugin-react";
import { defineConfig, mergeConfig, type UserConfig } from "vite";

import {
  createLibraryRuntimePlugin,
  createReleasePlugin,
  createSvgComponentPlugin,
  DEVELOPMENT_RELEASE_ID,
  getAssetFileName,
  RELEASE_ID
} from "./vite.parts.ts";
import { pClientDist, pDist, pPublic, pSrc } from "./vite.paths.ts";

/** What every mode shares: the page's folder, its plugins, the public files, one React. */
const clientCommon: UserConfig = {
  root: pSrc,
  publicDir: pPublic,
  plugins: [
    react(),
    createSvgComponentPlugin(),
    createLibraryRuntimePlugin({
      packageName: "wasm-engine",
      runtimeFilePattern: /[\\/]wasm-engine[\\/]dist[\\/]esm[\\/][^\\/]+\.js$/
    })
  ],
  resolve: { dedupe: ["react", "react-dom"] },
  // The library loads its worker by URL: prebundling would move it away from its files.
  optimizeDeps: { exclude: ["wasm-engine"] }
};

/** Development: no release to watch, CSS mapped to its source. */
const clientBuild: UserConfig = {
  plugins: [createReleasePlugin(DEVELOPMENT_RELEASE_ID)],
  css: { devSourcemap: true }
};

/** Production: files by kind, nothing inlined, private maps, one framework chunk, the release. */
const clientDist: UserConfig = {
  plugins: [createReleasePlugin(RELEASE_ID)],
  build: {
    outDir: pClientDist,
    emptyOutDir: true,
    manifest: true,
    sourcemap: "hidden",
    // Every file is its own request, cached on its own.
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        entryFileNames: "scripts/[name].[hash].js",
        chunkFileNames: "scripts/[name].[hash].js",
        assetFileNames: getAssetFileName,
        codeSplitting: {
          groups: [
            {
              // Changes only when React does, so it stays cached across app deploys.
              name: "framework",
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 40
            }
          ]
        }
      }
    }
  }
};

/** The production build, written apart, for an analyzer. */
const clientDistProfile: UserConfig = mergeConfig(clientDist, {
  build: { outDir: `${pDist}/client-profile` }
});

const MODE_CONFIGS_MAP: Readonly<Record<string, UserConfig>> = {
  development: clientBuild,
  production: clientDist,
  profile: clientDistProfile
};

export default defineConfig(({ mode }) => mergeConfig(clientCommon, MODE_CONFIGS_MAP[mode] ?? {}));
```

```ts
// vite.config.server.ts: the app's server for Node, built apart from the client.
import { defineConfig } from "vite";

import { pServerDist, pServerEntry } from "./vite.paths.ts";

export default defineConfig({
  // The public files belong to the client; the server folder holds only the server.
  publicDir: false,
  build: {
    ssr: pServerEntry,
    outDir: pServerDist,
    emptyOutDir: true,
    // Maps beside the bundle, read by `node --enable-source-maps`; the folder is never served.
    sourcemap: true,
    rolldownOptions: { output: { entryFileNames: "server.mjs" } }
  }
});
```

```jsonc
// package.json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build && vite build -c vite.config.server.ts && npm run compress",
    "compress": "node scripts/compress-assets.mjs dist/client",
    "build:profile": "vite build --mode profile",
    "start": "node --enable-source-maps dist/server/server.mjs"
  }
}
```

- **The page names its entry.** Vite reads `src/index.html` as the build's input, so the template
  carries `<script type="module" src="./index.tsx"></script>` where webpack's has none.
- **Plugins are the parts.** Vite has no loader rules: `createSvgComponentPlugin`,
  `createReleasePlugin`, and `createLibraryRuntimePlugin` are made once and listed by the layer that
  needs them, the release plugin once per mode with its own id.
- **Hashed names match webpack's shape**, `<name>.<hash>.<ext>`, set on entries, chunks, and assets;
  Vite's default `<name>-<hash>` would slip past a server rule written for one bundler. Vite's hash
  is 8 base64url characters, webpack's 8 hex ones, and the static-files rule takes both.
- **`assetFileNames` puts every file in its kind's folder**, `assetsInlineLimit: 0` keeps files
  under 4 KB from becoming data URLs, and `publicDir` copies the icons and the manifest as they are.
- **The framework group is a Rolldown `codeSplitting` group**: `name`, `test`, and `priority`.
- **Development defines the release id through Vite's env module**, so the watcher sees
  `development` and stays off; CSS maps in development come from `css.devSourcemap`.
- **The server build sets `publicDir: false`**, or Vite copies the client's public files into
  `dist/server`. Vite leaves the server's dependencies as imports (`node_modules` at run time),
  where webpack bundles them; `ssr.noExternal: true` bundles them under Vite too.
- `optimizeDeps.exclude` keeps a library that loads its own files by URL out of dependency
  prebundling, which would move its entry away from those files.
- Vite transpiles TypeScript itself and never type-checks; its default target already ships modern
  syntax, and a browserslist that asks for less becomes `build.target`.
- `build.chunkSizeWarningLimit` only warns, so the budget is enforced by [§ Measuring](#measuring).

## Asset folders and public files

- **Every emitted file lands in its kind's folder, named by its content hash**: `scripts/`,
  `styles/`, `images/`, `fonts/`, `media/`, `wasm/`. One rule per kind, made from a map, sets
  `generator.filename`, and `output.assetModuleFilename` catches the rest (a file reached through
  `new URL("./x.bin", import.meta.url)`). A host then gives one kind its own headers in one line (a
  font fetched from another origin needs `Access-Control-Allow-Origin`), and a reader of the output
  sees what ships.
- **Asset rules are scoped by type, not by folder.** A rule limited to `include: [pAssets]` refuses
  the font a dependency's stylesheet names, and the build fails on it; the asset rules take every
  matching file, and the stylesheet rule reads `node_modules` too.
- **A file stays a file.** Every asset is `asset/resource`, and Vite's `assetsInlineLimit` is `0`: a
  data URL is a third larger in base64, is copied into every chunk that uses it, and is cached only
  with that chunk, while a separate file costs one request over HTTP/2.
- **Public files keep stable names at the site root.** The favicon set and the web manifest live in
  `public/`, copied as they are (`copy-webpack-plugin`, or Vite's `publicDir`), and the page links
  them. They get a short cache, never `immutable`, since a deploy may replace one under its name.
- **A favicon set, not one PNG**: `favicon.ico` at 32 px for the clients that only ask for
  `/favicon.ico`, an SVG icon that follows the colour scheme, `apple-touch-icon.png` at 180 px, and
  the manifest's 192 px and 512 px PNGs. `HtmlWebpackPlugin`'s `favicon` option emits one file, so a
  set goes through the public folder; one tool owns each file, since the option and a copy of the
  same file write it twice.

## Source maps

| Target            | webpack `devtool`                                | Vite                                                                 |
| ----------------- | ------------------------------------------------ | -------------------------------------------------------------------- |
| Development       | `eval-cheap-module-source-map`                   | Each module served with its map; CSS maps through `css.devSourcemap` |
| Production client | `hidden-source-map`                              | `build.sourcemap: "hidden"`                                          |
| Server            | `source-map`, run by `node --enable-source-maps` | `build.sourcemap: true` in the server build                          |

- **Development trades exactness for speed.** `eval-cheap-module-source-map` maps each line to the
  original source, skips columns, and rebuilds fastest. `eval` needs `'unsafe-eval'` in the page's
  Content Security Policy, so that grant belongs to the development policy alone; a dev server that
  serves the production policy uses `cheap-module-source-map` instead. Vite serves each module with
  its own map and evaluates nothing.
- **Production maps exist, unlinked and unserved.** `hidden-source-map` writes them without the
  `sourceMappingURL` comment; the release uploads them to the error tracker and publishes without
  them ([§ Serving and deploying](#serving-and-deploying)). `source-map` links every script to a
  public map, and `false` leaves production stack traces unreadable; a build too large to map on its
  host is built in CI instead.
- **The server maps its own stack traces.** Its bundle and map sit in `dist/server`, which is never
  served, and `node --enable-source-maps` turns a logged stack trace back into source lines.

## Transpile and minify

- **An app transpiles, and only that.** Nothing imports an app's types, so the bundler strips them
  with swc (`swc-loader`) and never runs the type checker; the check is its own step (`SKILL.md` §
  Build). A library that publishes types emits its declarations with `tsc --emitDeclarationOnly`,
  apart from bundling; in a workspace that consumes packages as source, nothing emits them.
- **Targets come from the browserslist.** swc's `env.targets` follows it; a fixed
  `jsc.target: "es6"` rewrites `async`/`await` into generator helpers and optional chaining into
  ternaries in every module, bigger and slower for browsers that run both natively. `env` and
  `jsc.target` exclude each other.
- **swc's options live in one place**: the rule with `swcrc: false`, or one `.swcrc`. Both at once
  merge silently. A Wasm plugin in `jsc.experimental.plugins` runs on every file, so only a used one
  stays (a loadable-components plugin in an app that uses `React.lazy` only costs build time).
- **`node_modules` is not transpiled**; a dependency that ships syntax the targets cannot run is the
  exception, included by name.
- **swc minifies too**: `TerserPlugin.swcMinify` with `extractComments: false`, since
  terser-webpack-plugin 5.6 passes that field to `@swc/core`, which rejects it.
- **Rspack is the cheapest large speed-up for an existing webpack config**: it reads the same config
  and has swc built in. Vite 8 transpiles with Oxc and needs `@vitejs/plugin-react-swc` only for an
  SWC plugin; a Babel plugin in `@vitejs/plugin-react` brings Babel's cost back.

## SVG assets

```ts
// src/assets.d.ts
declare module "*.svg?react" {
  import type React from "react";

  const SvgComponent: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }>;
  export default SvgComponent;
}

declare module "*.svg" {
  const url: string;
  export default url;
}
```

```tsx
// src/index.tsx
import "./app.css";

import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";

import CheckIcon from "./assets/check.svg?react";
import illustrationUrl from "./assets/illustration.svg";

const ReportPage = lazy(() =>
  import("./ReportPage.tsx").then(module => ({ default: module.ReportPage }))
);

const App = () => (
  <main className="frame">
    <CheckIcon aria-hidden="true" />
    <img src={illustrationUrl} alt="" width={400} height={100} loading="lazy" />
    <Suspense fallback={<p role="status">Loading</p>}>
      <ReportPage />
    </Suspense>
  </main>
);

const rootElement = document.getElementById("root");

if (rootElement !== null) {
  createRoot(rootElement).render(<App />);
}
```

- **A plain import is a URL**, shown by `<img>`: the browser caches it, parses no script for it, and
  builds no React nodes from it. That is the default for illustrations, logos, and anything over a
  few kilobytes; `loading="lazy"` defers one below the fold.
- **`?react` makes a component** for a small icon that takes `currentColor`, a size, or a title from
  its parent. It ships inside the importing chunk; the query is the same under webpack and Vite.
- **SVGO runs on every component, with `viewBox` kept**: the icon scales, and editor metadata and
  comments are dropped.
- **No lazy import per icon.** A 1–4 KB icon behind `lazy()` costs a request and a blank Suspense
  moment to save its own size. A large inline SVG that is not in the first view (an animated
  illustration) loads lazily; an icon set chosen by data, such as a picker, is one module that maps
  names to components, loaded lazily as one chunk:

  ```tsx
  // app/comp/category-icon/CategoryIcon.tsx
  import type React from "react";

  import BooksIcon from "#assets/icons/books.svg?react";
  import FoodIcon from "#assets/icons/food.svg?react";

  const ICONS_MAP = { books: BooksIcon, food: FoodIcon } as const;

  type Props = React.SVGProps<SVGSVGElement> & { iconName: keyof typeof ICONS_MAP };

  export const CategoryIcon: React.FC<Props> = ({ iconName, ...svgProps }) => {
    const Icon = ICONS_MAP[iconName];

    return <Icon {...svgProps} />;
  };

  CategoryIcon.displayName = "CategoryIcon";
  ```

- **An SVG named from CSS stays a file**: the component rule's `issuer` limits it to script imports,
  so `url(./icon.svg)` keeps working.

## Heavy libraries

A library that one feature needs loads when that feature runs, never with the first view:

```tsx
// src/useLazyDateFormatter.tsx
import { useCallback, useEffect, useState } from "react";

type FormatDate = (isoText: string) => string;

/** Loads the date library the first time a view needs it; until then, formats nothing. */
export function useLazyDateFormatter(): FormatDate | null {
  const [formatDate, setFormatDate] = useState<FormatDate | null>(null);

  useEffect(() => {
    let isCurrent = true;

    void import("luxon").then(({ DateTime }) => {
      if (isCurrent) {
        setFormatDate(() => (isoText: string) => DateTime.fromISO(isoText).toLocaleString());
      }
    });

    return () => {
      isCurrent = false;
    };
  }, []);

  return useCallback<FormatDate>(isoText => formatDate?.(isoText) ?? "", [formatDate]);
}
```

The traps that put one in the first load anyway:

- **A page's state registered at startup.** Reducers, effects, or models a page owns, registered in
  the global store when the app boots, import everything the page imports: a lazy page whose effects
  load at boot is not lazy. They register when the page mounts, or import the heavy dependency
  inside the effect that uses it.
- **A shared component that serves every case.** A component used by first-load views loads the
  library only for the case that needs it, after checking what the browser does natively:

  ```ts
  // core/media/stream-player.ts
  /** Plays HLS natively where the browser can, elsewhere through hls.js loaded on demand. */
  async function attachStream({
    videoElement,
    streamUrl
  }: {
    videoElement: HTMLVideoElement;
    streamUrl: string;
  }): Promise<() => void> {
    if (videoElement.canPlayType("application/vnd.apple.mpegurl") !== "") {
      videoElement.src = streamUrl;

      return () => videoElement.removeAttribute("src");
    }

    const { default: Hls } = await import("hls.js");
    const hls = new Hls();

    hls.loadSource(streamUrl);
    hls.attachMedia(videoElement);

    return () => hls.destroy();
  }

  export default { attachStream };
  ```

- **Analytics, session replay, and chat widgets** load once the first view is ready, from an idle
  callback (`requestIdleCallback`, or a timeout where the browser has none).
- **A workspace package bundled from its `dist/`** is app code to the bundler: no `node_modules`
  rule notices it, and one static import from the first load ships all of it.
- **A library that bundles every locale through a dynamic `require`** is narrowed with
  `webpack.IgnorePlugin` or `ContextReplacementPlugin`; under Vite only the imported locales ship.
- The emitted initial files are the check: none of them names a library the first view does not run
  ([§ Measuring](#measuring)).

## Chunks

- **Default splitting** (`splitChunks.chunks: "all"` with webpack's thresholds, one runtime chunk,
  deterministic ids) shares what several chunks use. Vite and Rolldown split by sharing by default.
- **One `framework` group** holds React, React DOM, and the scheduler, and the router when every
  route uses it: it changes when they do, so a returning visitor keeps it across app deploys.
- **No catch-all vendor chunk**, initial or async: every dependency bump changes it, and every page
  loads all of it.
- **No `enforce: true` beside size settings.** It makes webpack ignore `minSize`,
  `maxAsyncRequests`, `maxInitialRequests`, and `enforceSizeThreshold`, so a group that names one
  chunk per package turns into dozens of small requests.
- **Production ids stay deterministic.** `chunkIds: "named"` and a hand-written chunk-name hash
  repeat what `[name].[contenthash:8]` already gives; development names chunks by default.
- A further group answers a measurement ([§ Lazy chunks and a deploy](#lazy-chunks-and-a-deploy)).

## Dev loop

- **The filesystem cache** (`cache: { type: "filesystem" }`, the config in `buildDependencies`)
  makes a restart reuse the last build; Vite keeps its prebundled dependencies.
- **`eval-cheap-module-source-map`** in development: fast rebuilds, lines mapped.
- **React Refresh**: swc's `refresh` in development, `@pmmmwh/react-refresh-webpack-plugin`, and
  `devServer.hot`; under Vite the React plugin does it.
- **The type checker runs beside the dev server without blocking** (`fork-ts-checker-webpack-plugin`
  with `async: true`) and blocks in CI (`tsc --noEmit`).
- **One copy of React.** In a workspace, `resolve.alias` points `react` and `react-dom` at the app's
  copy (`resolve.dedupe` under Vite): a second copy breaks hooks and ships twice.
- **The dev server mounts the app's own server** (`setupMiddlewares`, or Vite's middleware mode):
  its headers, its API proxy, and its static rules are the ones production runs.
- **The watcher ignores build output and caches**, so a build never triggers another.

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

## New releases

A page left open keeps running the release it loaded. It learns of a newer one by asking, and loads
it at a moment that costs the person nothing.

- **One id per release, from one source.** The client build defines the id in the bundle
  (`__RELEASE_ID__`) and writes `release.json` from the same value in the same compilation
  (`createReleasePluginsList` in `webpack.parts.ts`). CI passes the commit as `RELEASE_ID`, so every
  build of one commit agrees; without it, the build's own time is the id. A static host serves the
  file like any other, so no server endpoint is needed. Development defines `development`, and the
  watcher stays off.
- **The release file is revalidated like the HTML** (`no-cache`), under a stable name beside it.
- **A service watches, not a component.** `ReleaseWatcher` is a framework-free class that the
  composition root builds and starts once. The network, the page, and the timers sit behind ports,
  so a suite drives it with fakes. It checks on an interval and whenever the page comes back into
  view, so a person returning after hours checks at once, and it announces each newer id once, as a
  typed event.
- **A hidden page reloads by itself; a visible one asks.** When the page is hidden, or goes hidden
  with a newer release known, it reloads if nothing would be lost: no active leave blocker, no
  upload in flight. A visible page shows a refresh offer, and the person chooses the moment.
- **Failures stay quiet.** An unreachable file (offline, mid-deploy) is an outcome, not an error,
  and the next check asks again.
- **It works beside `loadChunk`.** The watcher catches a release before anything breaks; `loadChunk`
  reloads once when a chunk fails anyway ([§ Lazy chunks and a deploy](#lazy-chunks-and-a-deploy)).

Under Vite, `createReleasePlugin` in `vite.parts.ts` does the same: `define` for the constant, and
`generateBundle` for the file.

```ts
// src/globals.d.ts
/** The release this bundle belongs to, defined by the build; `development` in development. */
declare const __RELEASE_ID__: string;
```

```ts
// src/core/release/types.ts
declare module "@acme/app-web" {
  namespace Web.Core.Release {
    /** What the release file says, or that it could not be read (offline, a deploy in progress). */
    type ReleaseRead = { status: "read"; releaseId: string } | { status: "unreachable" };

    /** Where the current release id comes from: `release.json` beside the HTML. */
    interface ReleaseSource {
      readReleaseId(): Promise<ReleaseRead>;
    }

    /** The page the app runs in: whether anyone sees it, and how to load it again. */
    interface PageHost {
      getIsHidden(): boolean;
      addVisibilityListener(listener: (isHidden: boolean) => void): () => void;
      reload(): void;
    }

    type CheckOutcome =
      { status: "current" } | { status: "released"; releaseId: string } | { status: "unreachable" };
  }
}

export {};
```

```ts
// src/core/release/release-watcher.ts
import EventerBase from "#web/base/eventer-base.ts";
import type { Web } from "@acme/app-web";

// A release rarely lands twice an hour; a returning person triggers a check of their own.
const DEFAULT_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Learns that a newer release is out. It checks the release file on an interval and whenever the
 * page comes back into view; on a new release it announces it once, and reloads a hidden page by
 * itself when nothing on it would be lost. A visible page shows the person a refresh instead.
 */
export default class ReleaseWatcher extends EventerBase<Web.Core.Release.ReleaseWatcher.Listeners> {
  readonly #releaseSource: Web.Core.Release.ReleaseSource;
  readonly #pageHost: Web.Core.Release.PageHost;
  readonly #scheduler: Web.Base.Scheduler;
  readonly #getIsReloadSafe: () => boolean;
  readonly #currentReleaseId: string;
  readonly #checkIntervalMs: number;

  #newReleaseId: string | null = null;
  #stopsList: (() => void)[] = [];

  constructor(
    {
      pageHost,
      releaseSource,
      scheduler,
      getIsReloadSafe
    }: Readonly<{
      pageHost: Web.Core.Release.PageHost;
      releaseSource: Web.Core.Release.ReleaseSource;
      scheduler: Web.Base.Scheduler;
      /** False while the page holds unsaved work: an active leave blocker, an upload. */
      getIsReloadSafe: () => boolean;
    }>,
    {
      currentReleaseId,
      checkIntervalMs = DEFAULT_CHECK_INTERVAL_MS
    }: Readonly<{ currentReleaseId: string; checkIntervalMs?: number }>
  ) {
    super();
    this.#pageHost = pageHost;
    this.#releaseSource = releaseSource;
    this.#scheduler = scheduler;
    this.#getIsReloadSafe = getIsReloadSafe;
    this.#currentReleaseId = currentReleaseId;
    this.#checkIntervalMs = checkIntervalMs;
  }

  /** The newer release the page has not loaded yet, or null. */
  getNewReleaseId(): string | null {
    return this.#newReleaseId;
  }

  start(): void {
    if (this.#stopsList.length > 0) {
      return;
    }

    this.#stopsList = [
      this.#scheduler.runEvery(this.#checkIntervalMs, () => void this.check()),
      this.#pageHost.addVisibilityListener(isHidden => {
        if (isHidden) {
          this.#reloadIfSafe();
        } else {
          void this.check();
        }
      })
    ];
  }

  stop(): void {
    for (const stop of this.#stopsList) {
      stop();
    }

    this.#stopsList = [];
  }

  async check(): Promise<Web.Core.Release.CheckOutcome> {
    const releaseRead = await this.#releaseSource.readReleaseId();

    if (releaseRead.status === "unreachable") {
      return { status: "unreachable" };
    }

    const { releaseId } = releaseRead;

    if (releaseId === this.#currentReleaseId) {
      return { status: "current" };
    }

    if (releaseId !== this.#newReleaseId) {
      this.#newReleaseId = releaseId;
      this.emit("released", releaseId);
    }

    if (this.#pageHost.getIsHidden()) {
      this.#reloadIfSafe();
    }

    return { status: "released", releaseId };
  }

  /** Loads the new release now, because the person asked for it. */
  reload(): void {
    this.#pageHost.reload();
  }

  #reloadIfSafe(): void {
    if (this.#newReleaseId !== null && this.#getIsReloadSafe()) {
      this.#pageHost.reload();
    }
  }
}

declare module "@acme/app-web" {
  namespace Web.Core.Release.ReleaseWatcher {
    type INSTANCE = ReleaseWatcher;

    type Listeners = {
      /** Once per newer release, with its id. */
      released: (releaseId: string) => void;
    };
  }
}
```

```ts
// src/core/release/release-file-source.adapter.ts
import type { Web } from "@acme/app-web";

// Beside the HTML, under a name every release keeps, revalidated like the HTML.
const RELEASE_FILE_NAME = "release.json";

type FetchFile = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "json">>;

function getIsReleaseFile(parsedJson: unknown): parsedJson is { releaseId: string } {
  return (
    typeof parsedJson === "object" &&
    parsedJson !== null &&
    "releaseId" in parsedJson &&
    typeof parsedJson.releaseId === "string"
  );
}

/** Reads the deployed release id from `release.json`, never from a cache. */
export default class ReleaseFileSource implements Web.Core.Release.ReleaseSource {
  readonly #fetchFile: FetchFile;
  readonly #releaseFileUrl: string;

  constructor(
    { fetchFile }: Readonly<{ fetchFile: FetchFile }>,
    { releaseFileUrl }: Readonly<{ releaseFileUrl: string }>
  ) {
    this.#fetchFile = fetchFile;
    this.#releaseFileUrl = releaseFileUrl;
  }

  /** The page's own fetch, and the release file beside the page's base URL. */
  static open(): ReleaseFileSource {
    return new ReleaseFileSource(
      { fetchFile: (url, init) => fetch(url, init) },
      { releaseFileUrl: new URL(RELEASE_FILE_NAME, document.baseURI).href }
    );
  }

  async readReleaseId(): Promise<Web.Core.Release.ReleaseRead> {
    try {
      const response = await this.#fetchFile(this.#releaseFileUrl, { cache: "no-store" });

      if (!response.ok) {
        return { status: "unreachable" };
      }

      const parsedJson: unknown = await response.json();

      return getIsReleaseFile(parsedJson)
        ? { status: "read", releaseId: parsedJson.releaseId }
        : { status: "unreachable" };
    } catch {
      // Offline, or the file mid-deploy: the next check asks again.
      return { status: "unreachable" };
    }
  }
}
```

```ts
// src/core/release/browser-page-host.adapter.ts
import type { Web } from "@acme/app-web";

/** The browser page: its visibility, and a reload that fetches the HTML again. */
export default class BrowserPageHost implements Web.Core.Release.PageHost {
  readonly #document: Document;
  readonly #location: Location;

  constructor({ document, location }: Readonly<{ document: Document; location: Location }>) {
    this.#document = document;
    this.#location = location;
  }

  static open(): BrowserPageHost {
    return new BrowserPageHost({ document, location });
  }

  getIsHidden(): boolean {
    return this.#document.visibilityState === "hidden";
  }

  addVisibilityListener(listener: (isHidden: boolean) => void): () => void {
    const emitVisibility = () => listener(this.getIsHidden());

    this.#document.addEventListener("visibilitychange", emitVisibility);

    return () => this.#document.removeEventListener("visibilitychange", emitVisibility);
  }

  reload(): void {
    this.#location.reload();
  }
}
```

```ts
// src/base/interval-scheduler.adapter.ts
import type { Web } from "@acme/app-web";

/** Runs a task every interval on the page's timers; the returned function stops it. */
export default class IntervalScheduler implements Web.Base.Scheduler {
  runEvery(intervalMs: number, task: () => void): () => void {
    const intervalHandle = setInterval(task, intervalMs);

    return () => clearInterval(intervalHandle);
  }
}

declare module "@acme/app-web" {
  namespace Web.Base {
    /** Repeats a task; a suite passes one it fires by hand. */
    interface Scheduler {
      runEvery(intervalMs: number, task: () => void): () => void;
    }
  }
}
```

```tsx
// src/app/release/useNewReleaseId.tsx
import { useCallback, useSyncExternalStore } from "react";

import type { Web } from "@acme/app-web";

/** The newer release the page has not loaded yet, or null; renders again when one lands. */
export function useNewReleaseId(
  releaseWatcher: Web.Core.Release.ReleaseWatcher.INSTANCE
): string | null {
  const subscribe = useCallback(
    (storeListener: () => void) => {
      releaseWatcher.addEventListener("released", storeListener);

      return () => releaseWatcher.removeEventListener("released", storeListener);
    },
    [releaseWatcher]
  );
  const getSnapshot = useCallback(() => releaseWatcher.getNewReleaseId(), [releaseWatcher]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
```

```tsx
// src/app/release/NewReleaseBanner.tsx
import type React from "react";

import type { Web } from "@acme/app-web";

import { useNewReleaseId } from "#web/app/release/useNewReleaseId.tsx";

type Props = { releaseWatcher: Web.Core.Release.ReleaseWatcher.INSTANCE };

/** Offers the newer release; the person chooses when to load it. */
export const NewReleaseBanner: React.FC<Props> = ({ releaseWatcher }) => {
  const newReleaseId = useNewReleaseId(releaseWatcher);

  if (newReleaseId === null) {
    return null;
  }

  return (
    <div role="status">
      A new version is ready.
      <button type="button" onClick={() => releaseWatcher.reload()}>
        Refresh
      </button>
    </div>
  );
};

NewReleaseBanner.displayName = "NewReleaseBanner";
```

```tsx
// src/index.tsx, the composition root
// The composition root starts the watcher once, outside React; development has no release.
const releaseWatcher = new ReleaseWatcher(
  {
    releaseSource: ReleaseFileSource.open(),
    pageHost: BrowserPageHost.open(),
    scheduler: new IntervalScheduler(),
    // The app's own answer goes here: false while a leave blocker is active or an upload runs.
    getIsReloadSafe: () => true
  },
  { currentReleaseId: __RELEASE_ID__ }
);

if (__RELEASE_ID__ !== "development") {
  releaseWatcher.start();
}
```

- The banner reads the watcher through a hook over `useSyncExternalStore`; a state library's model
  may subscribe instead, when more than one view needs the release.
- `onClick={() => releaseWatcher.reload()}` keeps the method bound to its instance.

```ts
// test/core/release/release-watcher.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Web } from "@acme/app-web";

import ReleaseWatcher from "#web/core/release/release-watcher.ts";

type Fakes = {
  releaseReadsList: Web.Core.Release.ReleaseRead[];
  isHidden: boolean;
  isReloadSafe: boolean;
};

/** A watcher over fakes that answer from `fakes` and record what the watcher did. */
function buildWatcher(fakes: Fakes) {
  const calls = { reloadCount: 0, scheduledTasksList: [] as (() => void)[] };
  const visibilityListenersList: ((isHidden: boolean) => void)[] = [];

  const releaseSource: Web.Core.Release.ReleaseSource = {
    readReleaseId: async () => fakes.releaseReadsList.shift() ?? { status: "unreachable" }
  };
  const pageHost: Web.Core.Release.PageHost = {
    getIsHidden: () => fakes.isHidden,
    addVisibilityListener: listener => {
      visibilityListenersList.push(listener);

      return () => visibilityListenersList.splice(visibilityListenersList.indexOf(listener), 1);
    },
    reload: () => {
      calls.reloadCount += 1;
    }
  };
  const scheduler: Web.Base.Scheduler = {
    runEvery: (_intervalMs, task) => {
      calls.scheduledTasksList.push(task);

      return () => calls.scheduledTasksList.splice(calls.scheduledTasksList.indexOf(task), 1);
    }
  };
  const releaseWatcher = new ReleaseWatcher(
    { releaseSource, pageHost, scheduler, getIsReloadSafe: () => fakes.isReloadSafe },
    { currentReleaseId: "release-1" }
  );

  return { calls, releaseWatcher, visibilityListenersList };
}

test("the same release, or an unreachable file, changes nothing", async () => {
  const { calls, releaseWatcher } = buildWatcher({
    releaseReadsList: [{ status: "read", releaseId: "release-1" }, { status: "unreachable" }],
    isHidden: true,
    isReloadSafe: true
  });

  assert.deepEqual(await releaseWatcher.check(), { status: "current" });
  assert.deepEqual(await releaseWatcher.check(), { status: "unreachable" });
  assert.equal(releaseWatcher.getNewReleaseId(), null);
  assert.equal(calls.reloadCount, 0);
});

test("a newer release is announced once, and a visible page is never reloaded for it", async () => {
  const { calls, releaseWatcher } = buildWatcher({
    releaseReadsList: [
      { status: "read", releaseId: "release-2" },
      { status: "read", releaseId: "release-2" }
    ],
    isHidden: false,
    isReloadSafe: true
  });
  const announcedList: string[] = [];

  releaseWatcher.addEventListener("released", releaseId => announcedList.push(releaseId));

  assert.deepEqual(await releaseWatcher.check(), { status: "released", releaseId: "release-2" });
  await releaseWatcher.check();

  assert.deepEqual(announcedList, ["release-2"]);
  assert.equal(releaseWatcher.getNewReleaseId(), "release-2");
  assert.equal(calls.reloadCount, 0);
});

test("a hidden page reloads itself for a newer release, unless it holds unsaved work", async () => {
  const safe = buildWatcher({
    releaseReadsList: [{ status: "read", releaseId: "release-2" }],
    isHidden: true,
    isReloadSafe: true
  });
  const unsafe = buildWatcher({
    releaseReadsList: [{ status: "read", releaseId: "release-2" }],
    isHidden: true,
    isReloadSafe: false
  });

  await safe.releaseWatcher.check();
  await unsafe.releaseWatcher.check();

  assert.equal(safe.calls.reloadCount, 1);
  assert.equal(unsafe.calls.reloadCount, 0);
});

test("a page coming into view checks; one leaving view reloads for a known release", async () => {
  const fakes: Fakes = {
    releaseReadsList: [{ status: "read", releaseId: "release-2" }],
    isHidden: false,
    isReloadSafe: true
  };
  const { calls, releaseWatcher, visibilityListenersList } = buildWatcher(fakes);

  releaseWatcher.start();
  visibilityListenersList.forEach(listener => listener(false));
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(releaseWatcher.getNewReleaseId(), "release-2");
  assert.equal(calls.reloadCount, 0);

  fakes.isHidden = true;
  visibilityListenersList.forEach(listener => listener(true));

  assert.equal(calls.reloadCount, 1);
});

test("start schedules one check and one visibility listener; stop removes both", () => {
  const { calls, releaseWatcher, visibilityListenersList } = buildWatcher({
    releaseReadsList: [],
    isHidden: false,
    isReloadSafe: true
  });

  releaseWatcher.start();
  releaseWatcher.start();

  assert.equal(calls.scheduledTasksList.length, 1);
  assert.equal(visibilityListenersList.length, 1);

  releaseWatcher.stop();

  assert.equal(calls.scheduledTasksList.length, 0);
  assert.equal(visibilityListenersList.length, 0);
});
```

## Splitting by role

- **Code only one role uses loads behind `import()`**: admin tools, an admin API client, internal
  dashboards. The route table renders the role's pages lazily ([web-router.md](web-router.md)), and
  nothing a first view imports reaches them, so every other person never downloads them.
- **A package with a role-only part exposes it as its own entry** (`@<scope>/api-client/admin`), so
  importing the main entry never brings it; the app imports the role entry only inside the role's
  lazy pages.
- **A large internal package that changes on its own rhythm** (a generated API client) may get a
  chunk group of its own after a measurement, so an app deploy that leaves it alone leaves it
  cached. The group takes `chunks: "initial"`, so the role entry, loaded lazily, stays in its own
  chunk.
- **The emitted initial files are the check**: none of them holds a module of a role-only entry
  ([§ Measuring](#measuring)).
- **Under Vite and Rolldown**, a role entry reached only through `import()` gets its own chunk by
  default, and a `codeSplitting` group for the internal package tests its main entry alone.

```ts
// Only an administrator calls these: they load with the admin tools, never with the first view.
const ADMIN_ENDPOINTS_MAP = {
  auditLog: "/api/admin/audit-log",
  members: "/api/admin/members"
} as const;

async function fetchAuditLinesList(): Promise<string[]> {
  const response = await fetch(ADMIN_ENDPOINTS_MAP.auditLog);

  return response.ok ? ((await response.json()) as string[]) : [];
}

export default { fetchAuditLinesList, ADMIN_ENDPOINTS_MAP };
```

```tsx
// src/app/admin/AdminTools.tsx
import type React from "react";

import adminApiClient from "#web/core/api/admin-api-client.ts";

export const AdminTools: React.FC = () => (
  <section aria-label="Admin tools">{adminApiClient.ADMIN_ENDPOINTS_MAP.auditLog}</section>
);

AdminTools.displayName = "AdminTools";
```

```tsx
// src/index.tsx
const AdminTools = lazy(() =>
  import("#web/app/admin/AdminTools.tsx").then(module => ({ default: module.AdminTools }))
);
```

## Library workers and Wasm

A library that runs a worker or WebAssembly needs URLs for files the bundler never imports as code.
Each URL is either one the app hands over, or one the library builds itself from a relative name.

- **A file the app hands over** is imported with `?url` and emitted as a hashed asset (the Wasm core
  below). The import reads the same under webpack and Vite.
- **Files a library loads by its own relative names** (a worker that imports `./const.js`) keep
  their names, side by side, in `vendor/<package>@<version>/` (`createRuleLibraryRuntime` in
  `webpack.parts.ts`). The relative imports resolve, and an upgrade gets a new folder, so the folder
  is cached for good. Each sibling the worker imports is imported once with `?url`, so it ships.
- **The minifier skips `vendor/`**: those are ES modules a script minifier would misread, and the
  library built them. Parsing every file as a module instead changes how the app's own chunks parse.
- **A library's computed `import()` warning is silenced for that library alone** (`ignoreWarnings`
  with its module path), never with a switch for every module.
- **The page's Content Security Policy names what runs**: compiling WebAssembly needs
  `'wasm-unsafe-eval'` in `script-src`, never `'unsafe-eval'`, and a module worker from the page's
  origin needs `worker-src 'self'`.
- **The library itself loads lazily** with the feature that uses it
  ([§ Heavy libraries](#heavy-libraries)).
- **Under Vite the same `?url` imports work**: `createLibraryRuntimePlugin` in `vite.parts.ts` emits
  those files with their names in the versioned folder, where Vite's own `?url` would hash them, and
  development serves them from the package folder, where the names already hold.
  `optimizeDeps.exclude` keeps the library out of dependency prebundling.

```ts
// The library's worker imports `./const.js` at run time: both ship, names kept, side by side.
import "wasm-engine/dist/esm/const.js?url";
import workerUrl from "wasm-engine/dist/esm/worker.js?url";
// The core is handed over by URL, so it is hashed like any asset.
import coreWasmUrl from "wasm-engine/core/core.wasm?url";

export default { coreWasmUrl, workerUrl };
```

```ts
// src/core/media/media-engine.ts
import engineFiles from "#web/core/media/engine-files.ts";

/** Starts the engine the first time a view needs it: the library loads with it, not before. */
async function startEngine(): Promise<{ terminate(): void }> {
  const { createEngine } = await import("wasm-engine");

  return createEngine(engineFiles);
}

export default { startEngine };
```

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
- **Assets share one prefix across releases.** Content hashes keep every name unique, so a release
  adds its files beside the last one's. A prefix per release (`/deployments/<commit>/`) gives every
  file a new URL on each deploy, and a returning visitor downloads the unchanged framework and
  library chunks again.
- A precompressed `.br` or `.gz` file is served for the request's `Accept-Encoding`, honouring its
  weights, with `Content-Encoding` naming the encoding, the original `Content-Type`, and
  `Vary: Accept-Encoding`; the plain file goes to a client that takes neither, unless it also rules
  out `identity`, which gets a 406.
- The release step uploads the hidden source maps to the error tracker under the release id, then
  publishes from an allowlist that leaves maps out.

### Compression

- **What**: text assets (scripts, styles, HTML, SVG, JSON, Wasm, TTF and OTF fonts). Images, video,
  and WOFF2 are compressed already.
- **How**: brotli at quality 11 and gzip at level 9, once per build, for files above about a
  kilobyte, keeping a variant only when it is at most 80 % of the file; the original stays for a
  client that takes neither. Brotli 11 is slow to write and fast to read, which suits files written
  once and read by every visitor: on the React chunk it gives 39 KB against gzip's 45 KB, from 141
  KB. zstd waits until every target browser sends it, and brotli 11 is smaller still.
- **Where**: the webpack plugin (§ webpack 5 production config), or this release step over the
  output folder, under any bundler:

```js
// scripts/compress-assets.mjs: precompresses a build's text assets, for any bundler.
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import zlib from "node:zlib";

const brotliCompress = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

// Text worth compressing; images, video, and woff2 are compressed already.
const COMPRESSIBLE_PATTERN = /\.(js|mjs|css|html|svg|json|wasm|txt|xml|ttf|otf)$/;
// Under about a kilobyte a response fits the same packets compressed or not.
const COMPRESS_MIN_BYTES = 1024;
// A variant that saves less than a fifth is not worth a second file.
const MAX_COMPRESSED_RATIO = 0.8;

const ENCODINGS_LIST = [
  {
    extension: ".br",
    compress: bytes =>
      brotliCompress(bytes, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: bytes.length
        }
      })
  },
  { extension: ".gz", compress: bytes => gzip(bytes, { level: zlib.constants.Z_BEST_COMPRESSION }) }
];

async function compressFile(filePath) {
  const bytes = await fs.readFile(filePath);

  if (bytes.length < COMPRESS_MIN_BYTES) {
    return [];
  }

  const writtenList = [];

  for (const { extension, compress } of ENCODINGS_LIST) {
    const compressedBytes = await compress(bytes);

    if (compressedBytes.length <= bytes.length * MAX_COMPRESSED_RATIO) {
      await fs.writeFile(`${filePath}${extension}`, compressedBytes);
      writtenList.push(`${path.basename(filePath)}${extension}`);
    }
  }

  return writtenList;
}

const distPath = path.resolve(process.argv[2] ?? "dist");
const filePathsList = (await fs.readdir(distPath, { recursive: true }))
  .filter(relativePath => COMPRESSIBLE_PATTERN.test(relativePath))
  .map(relativePath => path.join(distPath, relativePath));
const writtenList = (await Promise.all(filePathsList.map(compressFile))).flat();

process.stdout.write(`${writtenList.length} compressed files in ${distPath}\n`);
```

- **Served by the app server**, negotiation and caching come from the static middleware, and the
  cache header is set per file:

  ```ts
  // server/static-files.ts
  import expressStaticGzip from "express-static-gzip";

  // `<name>.<hash>.<ext>`: webpack's 8 hex characters or Vite's 8 base64url ones, in any folder.
  const HASHED_FILE_PATTERN = /\.[\w-]{8}\.[a-z0-9]+$/;
  // `vendor/<package>@<version>/`: a library's own files, whose URL changes with its version.
  const VERSIONED_FOLDER_PATTERN = /[\\/]vendor[\\/][^\\/]+@[^\\/]+[\\/]/;
  // A stable public name (an icon, the manifest) may change on any deploy: a day at most.
  const STABLE_FILE_MAX_AGE_S = 86400;
  // The page and the file that names the current release: checked on every request.
  const REVALIDATED_FILE_PATTERN = /(\.html|[\\/]release\.json)$/;

  /** Hashed or versioned files never change; the HTML and the release file are always checked. */
  function getCacheControl(filePath: string): string {
    if (HASHED_FILE_PATTERN.test(filePath) || VERSIONED_FOLDER_PATTERN.test(filePath)) {
      return "public, max-age=31536000, immutable";
    }

    return REVALIDATED_FILE_PATTERN.test(filePath)
      ? "no-cache"
      : `public, max-age=${STABLE_FILE_MAX_AGE_S}`;
  }

  /** Serves the build: brotli or gzip by the request, each file cached as its name allows. */
  function createStaticFiles(clientDistPath: string) {
    return expressStaticGzip(clientDistPath, {
      enableBrotli: true,
      orderPreference: ["br", "gz"],
      index: false,
      serveStatic: {
        setHeaders: (response, filePath) => {
          response.setHeader("Cache-Control", getCacheControl(filePath.replace(/\.(br|gz)$/, "")));
        }
      }
    });
  }

  export default { createStaticFiles };
  ```

  A middleware that sets one `Cache-Control` for every response before the static files wins:
  `serve-static` keeps a header already set, so its `maxAge` never applies, and a blanket
  `max-age=0, must-revalidate` makes every hashed script revalidate on every load.

- **Served from an object store and a CDN**, nothing negotiates by default. A `.br` and a `.gz`
  uploaded beside the original are separate objects the browser never asks for, unless the edge
  picks one by `Accept-Encoding` (a CDN function that rewrites the key and adds `Vary`). Without
  that, the CDN compresses on the fly within its limits (CloudFront compresses 1 KB to 10 MB), so a
  large Wasm module or an unminified bundle goes out uncompressed. Each variant is uploaded with the
  original's `Content-Type`, its `Content-Encoding`, and the hashed file's `Cache-Control`.

## Measuring

A script reads what the build emitted (webpack's stats, or Vite's manifest and output folder) and
counts two sets, each file once and compressed as it is served: the shell's paint (the runtime, the
shell's script, its CSS) and the first ready view (those, the app's initial scripts and CSS, and the
first route's lazy files). webpack's `performance` hints check each entry's raw bytes alone, so they
miss what two entries share and what loads after the entry; set to the budget with `hints: "error"`,
they still fail a build cheaply before the script runs. A browser trace of a cold and a cached load
of the main routes adds when each set paints.

The same output answers which library put weight in the first load: `webpack --json` stats with
`webpack-bundle-analyzer` (compressed sizes), Rsdoctor, or `rollup-plugin-visualizer` under Vite.
Without stats, the initial scripts' source maps list each source file; summing `sourcesContent` by
package names the heavy ones, though before minifying it counts code the minifier would drop.
