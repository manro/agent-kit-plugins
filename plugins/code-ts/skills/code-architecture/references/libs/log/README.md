# @manro/lib-log

Diagnostics for people and log pipelines, apart from command results. A `Logger` writes leveled
entries with a scope and fields to a `Sink`, blanking every field whose key names a secret first; an
`Output` takes results verbatim, never filtered by level. Runs anywhere: no Node API.

| `LOG.`           | Holds                                                                |
| ---------------- | -------------------------------------------------------------------- |
| `Logger`         | `trace` … `fatal`, `createChild(scope, fieldsMap)`, `createSilent()` |
| `MemoryOutput`   | Results held as `text` and `linesList`, for tests                    |
| `MemorySink`     | Entries held as data, for tests                                      |
| `fieldsRedactor` | `redactFieldsMap(fieldsMap)`: a copy with every secret blanked       |
| `logLevels`      | `getIsAtLeast({ level, threshold })`, `DEFAULT_LEVEL`, `LEVELS_LIST` |
| `valueWalker`    | `walkValue(value, convertNode)`: a deep copy that cuts cycles        |

`Log` holds `Entry`, `Fields`, `Sink`, `Output`, `Level`, `EntryLevel`, and `Logger.Deps`.

```ts
import { LOG } from "@manro/lib-log";

const sink = new LOG.MemorySink();
const logger = new LOG.Logger({ level: "debug", scope: "build", sink });

logger.createChild("lib").warn("slow bundle", { durationMs: 900, apiKey: "x" });
// sink.entriesList[0].scope === "build lib"; the apiKey field reads "[redacted]"
```

A logger with no `level` logs from `DEFAULT_LEVEL` (`info`) up. Fields whose key names a secret
(token, secret, password, authorization, cookie, API key, credential, private key) are redacted at
any depth, inside errors and their causes, on a copy: the logged values stay as they were. A value
that contains itself becomes `"[Circular]"` wherever `valueWalker` copies it, here and in the server
log lib's JSON. Code that logs takes a `Log.Logger.INSTANCE`.

Used by `@manro/lib-log-server`, which writes entries to the process streams, and `@manro/lib-cli`,
whose `io.logger` is a `Logger`. Dependency-free and `universal`, so its suites typecheck through
`test/tsconfig.json`, which adds Node's types.
