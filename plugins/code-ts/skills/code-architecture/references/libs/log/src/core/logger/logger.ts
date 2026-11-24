/**
 * Diagnostics for people and log pipelines: leveled entries carrying a scope (the base text every
 * line starts with) and fields, handed to a Sink that renders or ships them. Command results are
 * not logs; they go to an Output.
 */

import logLevels from "#log/core/level/log-levels.ts";
import fieldsRedactor from "#log/core/logger/utils/fields-redactor.ts";
import type { Log } from "#log/index.ts";

class Logger {
  readonly #fieldsMap: Log.Fields;
  readonly #level: Log.Level;
  readonly #scope: string;
  readonly #sink: Log.Sink;

  constructor({ fieldsMap, level, scope, sink }: Log.Logger.Deps) {
    this.#fieldsMap = fieldsMap ?? {};
    this.#level = level ?? logLevels.DEFAULT_LEVEL;
    this.#scope = scope ?? "";
    this.#sink = sink;
  }

  /** Drops every entry; the default where no one is listening, such as a unit test. */
  static createSilent(): Logger {
    return new Logger({ level: "silent", sink: { write: () => undefined } });
  }

  get level(): Log.Level {
    return this.#level;
  }

  get scope(): string {
    return this.#scope;
  }

  getIsEnabled(level: Log.EntryLevel): boolean {
    return logLevels.getIsAtLeast({ level, threshold: this.#level });
  }

  /** Same sink and level; `scope` is appended to this logger's, `fieldsMap` merged over its own. */
  createChild(scope: string, fieldsMap: Log.Fields = {}): Logger {
    return new Logger({
      fieldsMap: { ...this.#fieldsMap, ...fieldsMap },
      level: this.#level,
      scope: [this.#scope, scope].filter(Boolean).join(" "),
      sink: this.#sink
    });
  }

  trace(message: string, fieldsMap?: Log.Fields): void {
    this.#write({ level: "trace", message, fieldsMap });
  }

  debug(message: string, fieldsMap?: Log.Fields): void {
    this.#write({ level: "debug", message, fieldsMap });
  }

  info(message: string, fieldsMap?: Log.Fields): void {
    this.#write({ level: "info", message, fieldsMap });
  }

  warn(message: string, fieldsMap?: Log.Fields): void {
    this.#write({ level: "warn", message, fieldsMap });
  }

  error(message: string, fieldsMap?: Log.Fields): void {
    this.#write({ level: "error", message, fieldsMap });
  }

  fatal(message: string, fieldsMap?: Log.Fields): void {
    this.#write({ level: "fatal", message, fieldsMap });
  }

  #write({
    level,
    message,
    fieldsMap = {}
  }: {
    level: Log.EntryLevel;
    message: string;
    fieldsMap?: Log.Fields;
  }): void {
    if (!this.getIsEnabled(level)) {
      return;
    }

    const mergedFieldsMap = fieldsRedactor.redactFieldsMap({ ...this.#fieldsMap, ...fieldsMap });

    this.#sink.write({ level, scope: this.#scope, message, fieldsMap: mergedFieldsMap });
  }
}

export default Logger;

declare module "@manro/lib-log" {
  namespace Log {
    namespace Logger {
      type INSTANCE = Logger;

      type Deps = {
        readonly fieldsMap?: Fields;
        /** Entries below this level are dropped before the sink sees them. Default `info`. */
        readonly level?: Level;
        readonly scope?: string;
        readonly sink: Sink;
      };
    }
  }
}
