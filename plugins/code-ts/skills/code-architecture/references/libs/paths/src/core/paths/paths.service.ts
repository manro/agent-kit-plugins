/**
 * Paths a package names once, anchored to the nearest folder above a module that holds a marker
 * file, instead of being climbed to with `..` from wherever the module sits. A marker other than
 * `package.json` keeps the anchor in a bundle, whose chunks ship without one.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import PathsRootMissingError from "#paths/core/paths/paths-root-missing.error.ts";
import type { Paths } from "#paths/index.ts";

const DEFAULT_ROOT_MARKER_NAME = "package.json";

class PathsService<N extends Paths.NamedPaths> {
  readonly #moduleUrl: string;
  readonly #relativePathsMap: N;
  readonly #rootMarkerName: string;

  #rootPath: string | undefined;

  constructor({
    moduleUrl,
    relativePathsMap,
    rootMarkerName = DEFAULT_ROOT_MARKER_NAME
  }: Paths.PathsService.Deps<N>) {
    this.#moduleUrl = moduleUrl;
    this.#relativePathsMap = relativePathsMap;
    this.#rootMarkerName = rootMarkerName;
  }

  /** The nearest folder at or above the module holding the marker, found on first use. */
  get rootPath(): string {
    this.#rootPath ??= this.#findRootPath();

    return this.#rootPath;
  }

  /** The absolute path declared under `name`. */
  getPath(name: keyof N & string): string {
    return path.join(this.rootPath, this.#relativePathsMap[name]!);
  }

  #findRootPath(): string {
    const modulePath = fileURLToPath(this.#moduleUrl);
    let dirPath = path.dirname(modulePath);

    while (!existsSync(path.join(dirPath, this.#rootMarkerName))) {
      const parentDirPath = path.dirname(dirPath);

      if (parentDirPath === dirPath) {
        throw new PathsRootMissingError(`no ${this.#rootMarkerName} above ${modulePath}`);
      }

      dirPath = parentDirPath;
    }

    return dirPath;
  }
}

export default PathsService;

declare module "@manro/lib-paths" {
  namespace Paths {
    /** Name to a path relative to the root. */
    type NamedPaths = Readonly<Record<string, string>>;

    namespace PathsService {
      type INSTANCE<N extends NamedPaths = NamedPaths> = PathsService<N>;

      type Deps<N extends NamedPaths> = {
        /** The declaring module's `import.meta.url`. */
        readonly moduleUrl: string;
        readonly relativePathsMap: N;
        /** The file whose folder is the root: `package.json` by default. */
        readonly rootMarkerName?: string;
      };
    }
  }
}
