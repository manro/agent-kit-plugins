import PathsService from "#paths/core/paths/paths.service.ts";
import PathsRootMissingError from "#paths/core/paths/paths-root-missing.error.ts";

export const PATHS = { PathsRootMissingError, PathsService } as const;

export namespace Paths {}
