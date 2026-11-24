# @manro/lib-log-server

The Node side of `@manro/lib-log`: a sink that writes to a stream, the log options a command line
and the environment choose, and the standard-stream outputs.

| `LOG_SERVER.`        | Holds                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| `LogOptionsError`    | A log flag with a value the logger does not take                       |
| `StreamOutput`       | An `Output` on a text stream                                           |
| `StreamSink`         | Writes each entry as `pretty`, `plain`, or `json`                      |
| `clockTimeFormatter` | `formatClockTime(epochMs)`: local `HH:MM:SS.mmm`                       |
| `envService`         | Reads `LOG_LEVEL` and `LOG_FORMAT`                                     |
| `fieldsSerializer`   | `toJsonFieldsMap`, `formatFieldValue`: errors, BigInts, cycles to JSON |
| `logFormatsConfig`   | `FORMATS_LIST`: `pretty`, `plain`, `json`                              |
| `logOptions`         | `parse({ env, flags, isTerminal })`                                    |
| `standardOutputs`    | `stdout` and `stderr` outputs, the only module that touches them       |

```ts
import { LOG } from "@manro/lib-log";
import { LOG_SERVER } from "@manro/lib-log-server";

const { level, format } = LOG_SERVER.logOptions.parse({
  env: LOG_SERVER.envService.values,
  flags: { level: "debug" },
  isTerminal: process.stderr.isTTY === true
});
const logger = new LOG.Logger({
  level,
  sink: new LOG_SERVER.StreamSink({ format, isColored: false, stream: process.stderr })
});
```

Flags win over the environment; with neither, the level is lib-log's `DEFAULT_LEVEL` and the format
is `pretty` on a terminal and `plain` elsewhere. A flag is checked like its variable, by lib-env's
one-of field, and an unknown value throws `LogOptionsError`. `pretty` prints the time, the level,
the scope and the message, then each field indented below; `plain` keeps an entry on one line;
`json` writes one object per line, where the core keys (`time`, `level`, `scope`, `msg`) win over a
field of the same name. Color is the caller's choice (`isColored`) and never applies to `json`. A
suite pins the clock with `new StreamSink(deps, { getNowMs })`.

Used by `@manro/lib-cli`, which builds every command's logger and outputs with it. Builds on
`@manro/lib-env` and `@manro/lib-log`; Node only (`node:util`'s `styleText`, the process streams).
