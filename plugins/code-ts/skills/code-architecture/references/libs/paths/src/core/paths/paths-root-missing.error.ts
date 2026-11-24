/** No folder above the module holds the root marker: the package was copied without it. */
export default class PathsRootMissingError extends Error {
  override readonly name = "PathsRootMissingError";
}

declare module "@manro/lib-paths" {
  namespace Paths {
    namespace PathsRootMissingError {
      type INSTANCE = PathsRootMissingError;
    }
  }
}
