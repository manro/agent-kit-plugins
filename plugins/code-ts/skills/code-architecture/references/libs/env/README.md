# @manro/lib-env

A typed read of environment variables. A package declares each variable it reads once, with its
kind; `EnvService` is the only module in agent-kit that reads `process.env`.

| `ENV.`       | Holds                                                                        |
| ------------ | ---------------------------------------------------------------------------- |
| `EnvError`   | Every refused variable in one message, joined by `; `                        |
| `EnvService` | Reads a declared set of variables: `values` (lazy) or `read(map)`            |
| `envFields`  | Field kinds: `buildFlagField()`, `buildOneOfField(list)`, `buildTextField()` |

```ts
import { ENV, type Env } from "@manro/lib-env";

const ENV_SCHEMA = {
  CI: ENV.envFields.buildFlagField(),
  LOG_LEVEL: ENV.envFields.buildOneOfField(["debug", "info", "warn"])
};

const envService: Env.EnvService.INSTANCE<typeof ENV_SCHEMA> = new ENV.EnvService(ENV_SCHEMA);

envService.values.CI; // boolean, read from process.env on first use
envService.read({ LOG_LEVEL: "loud" }); // throws EnvError: LOG_LEVEL must be one of …
```

Each field decides what an empty value means. A text or one-of field treats empty as unset; a flag
field treats any value, empty included, as set, which matches `NO_COLOR` and the agent markers. A
field's `read(rawValue)` answers `{ value }` or `{ problem }`, so a command-line flag can be checked
the same way (`@manro/lib-log-server` does). Tests pass a map to `read()` instead of setting
`process.env`.

A package's `config/env.service.ts` types its instance as `Env.EnvService.INSTANCE<typeof …>`:
without the name, the emitted declarations cannot reach `EnvService` through `@manro/lib-env`.

Used by `@manro/lib-cli` (the mode variables) and `@manro/lib-log-server` (the log variables).
Dependency-free; Node only, since it reads `process.env`.
