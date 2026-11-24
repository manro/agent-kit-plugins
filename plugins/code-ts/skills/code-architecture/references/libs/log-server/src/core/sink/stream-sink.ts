/**
 * Writes each log entry to a text stream as it comes: `pretty` for a person on a terminal (time,
 * colored level, fields indented below), `plain` as one line, or `json` as one object per line.
 */

import { styleText } from "node:util";

import type { Log } from "@manro/lib-log";

import clockTimeFormatter from "#log-server/base/utils/clock-time-formatter.ts";
import fieldsSerializer from "#log-server/core/sink/utils/fields-serializer.ts";
import type { LogServer } from "#log-server/index.ts";

type TextStyle = Parameters<typeof styleText>[0];

const LEVEL_STYLES_MAP: Readonly<Record<Log.EntryLevel, TextStyle>> = {
  trace: "gray",
  debug: "blue",
  info: "green",
  warn: "yellow",
  error: "red",
  fatal: ["bgRed", "white"]
};

const FIELD_INDENT = "    ";

class StreamSink implements Log.Sink {
  readonly #format: LogServer.Format;
  readonly #isColored: boolean;
  readonly #stream: LogServer.TextStream;
  readonly #getNowMs: () => number;

  constructor(
    { format, isColored, stream }: LogServer.StreamSink.Deps,
    { getNowMs = () => Date.now() }: LogServer.StreamSink.Options = {}
  ) {
    this.#format = format;
    this.#isColored = isColored;
    this.#stream = stream;
    this.#getNowMs = getNowMs;
  }

  write(logEntry: Log.Entry): void {
    this.#stream.write(`${this.#render(logEntry)}\n`);
  }

  #render(logEntry: Log.Entry): string {
    if (this.#format === "json") {
      return this.#renderJson(logEntry);
    }

    return this.#format === "pretty" ? this.#renderPretty(logEntry) : this.#renderPlain(logEntry);
  }

  #renderPlain({ level, scope, message, fieldsMap }: Log.Entry): string {
    const fieldsText = Object.keys(fieldsMap).length
      ? ` ${JSON.stringify(fieldsSerializer.toJsonFieldsMap(fieldsMap))}`
      : "";

    return `${this.#formatLevel(level)}: ${scope ? `${scope}: ` : ""}${message}${fieldsText}`;
  }

  #renderPretty({ level, scope, message, fieldsMap }: Log.Entry): string {
    const clockText = clockTimeFormatter.formatClockTime(this.#getNowMs());
    const timeText = this.#formatStyled("gray", `[${clockText}]`);
    const scopeText = scope ? `${this.#formatStyled("cyan", scope)} ` : "";

    const fieldLinesList = Object.entries(fieldsMap).map(([key, fieldValue]) =>
      fieldValue instanceof Error && fieldValue.stack
        ? `${FIELD_INDENT}${key}: ${fieldValue.stack.replaceAll("\n", `\n${FIELD_INDENT}`)}`
        : `${FIELD_INDENT}${key}: ${fieldsSerializer.formatFieldValue(fieldValue)}`
    );

    return [
      `${timeText} ${this.#formatLevel(level)}: ${scopeText}${message}`,
      ...fieldLinesList
    ].join("\n");
  }

  /** Core keys win over a field of the same name. */
  #renderJson({ level, scope, message, fieldsMap }: Log.Entry): string {
    const lineMap: Record<string, unknown> = {
      level,
      time: new Date(this.#getNowMs()).toISOString(),
      ...(scope ? { scope } : {}),
      msg: message
    };

    for (const [key, fieldValue] of Object.entries(fieldsSerializer.toJsonFieldsMap(fieldsMap))) {
      if (!(key in lineMap)) {
        lineMap[key] = fieldValue;
      }
    }

    return JSON.stringify(lineMap);
  }

  #formatLevel(level: Log.EntryLevel): string {
    return this.#formatStyled(LEVEL_STYLES_MAP[level], level.toUpperCase());
  }

  /** Color was decided once by the caller, so the stream and environment are not checked again. */
  #formatStyled(textStyle: TextStyle, text: string): string {
    return this.#isColored ? styleText(textStyle, text, { validateStream: false }) : text;
  }
}

export default StreamSink;

declare module "@manro/lib-log-server" {
  namespace LogServer {
    namespace StreamSink {
      type INSTANCE = StreamSink;

      type Deps = {
        readonly format: Format;
        /** Whether `pretty` and `plain` lines carry color; `json` never does. */
        readonly isColored: boolean;
        /** `process.stderr`, or a test's stand-in. */
        readonly stream: TextStream;
      };

      type Options = {
        /** The clock behind each line's time; tests pin it. */
        readonly getNowMs?: () => number;
      };
    }
  }
}
