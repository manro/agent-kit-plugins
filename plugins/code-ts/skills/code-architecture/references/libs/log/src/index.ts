import valueWalker from "#log/base/utils/value-walker.ts";
import logLevels from "#log/core/level/log-levels.ts";
import Logger from "#log/core/logger/logger.ts";
import MemorySink from "#log/core/logger/memory-sink.ts";
import type {} from "#log/core/logger/types.ts";
import fieldsRedactor from "#log/core/logger/utils/fields-redactor.ts";
import MemoryOutput from "#log/core/output/memory-output.ts";
import type {} from "#log/core/output/types.ts";

export const LOG = {
  Logger,
  MemoryOutput,
  MemorySink,
  fieldsRedactor,
  logLevels,
  valueWalker
} as const;

export namespace Log {}
