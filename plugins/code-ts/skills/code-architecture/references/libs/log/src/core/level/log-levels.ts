import type { Log } from "#log/index.ts";

const LEVELS_LIST = ["trace", "debug", "info", "warn", "error", "fatal", "silent"] as const;
/** The threshold when nothing names one: a logger's default, and the log flags'. */
const DEFAULT_LEVEL: Log.Level = "info";

/** Whether an entry at `level` passes a logger whose threshold is `threshold`. */
function getIsAtLeast({ level, threshold }: { level: Log.Level; threshold: Log.Level }): boolean {
  return LEVELS_LIST.indexOf(level) >= LEVELS_LIST.indexOf(threshold);
}

export default { getIsAtLeast, DEFAULT_LEVEL, LEVELS_LIST };

declare module "@manro/lib-log" {
  namespace Log {
    type Level = (typeof LEVELS_LIST)[number];
    /** `silent` is a threshold only; no entry carries it. */
    type EntryLevel = Exclude<Level, "silent">;
  }
}
