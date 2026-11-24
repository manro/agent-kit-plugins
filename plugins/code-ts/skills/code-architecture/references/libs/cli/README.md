# @manro/lib-cli

Shared CLI parsing, terminal progress, and prompts for agent-kit commands. Results go to stdout;
errors, help on failure, and terminal UI go to stderr. Explicit help goes to stdout.

| `CLI.`              | Holds                                                                    |
| ------------------- | ------------------------------------------------------------------------ |
| `CliUsageError`     | Bad input: the runner prints the command's usage after the message       |
| `cliModeResolver`   | `resolve(input)` to `{ mode, isColorEnabled }`, `AGENT_ENV_NAMES_LIST`   |
| `cliRunner`         | `runCli(options)`: parse options, dispatch, return an exit code          |
| `cliStyle`          | `PLAIN_STYLE`, and `buildStyle(formatStyled)` over every style name      |
| `envService`        | The variables the mode reads: `CI`, `NO_COLOR`, agent markers            |
| `memoryIo`          | `open(options)`: an `Io` held in memory, for command tests               |
| `optionValueParser` | `buildPositiveWholeNumberParser({ flagName, unitName })`: a `parseValue` |
| `CLI_EXIT_CODES`    | Shared `done` (0), `failed` (1), and `pending` (2) codes                 |

`Cli` holds the types for commands, options, I/O, styles, spinners, and prompts.

```ts
import { CLI, type Cli } from "@manro/lib-cli";

const command: Cli.Command = {
  name: "check",
  summary: "Check files",
  optionsList: [{ flags: "--check", description: "Report without writing" }],
  run(values, io) {
    io.output.writeLine(values.check ? "checked" : "done");
    return 0;
  }
};

process.exitCode = await CLI.cliRunner.runCli({
  name: "tool",
  summary: command.summary,
  commandsList: [command],
  argvSource: process
});
```

One command takes flags directly after the program name. Multiple commands dispatch by name; no
command or `help` lists them. Unknown flags, stray arguments, missing values, and a value outside an
option's `choicesList` (with or without `parseValue` or `isRepeatable`) exit 1. `--help` and `-h`
exit 0. Actions return their own exit codes. The runner never exits the process. Usage errors print
one error line, then `Usage: <program> [options] (see --help)` (including the subcommand where
applicable). Other thrown errors print their message on one line. Commands throw faults; only the
runner prints them. Both modes use the same renderer through `io.style`, whose plain implementation
is the identity. Commands always create and stop their spinner.

`io.output` and `io.errorOutput` are `Log.Output`s (`writeLine`, `write`) on stdout and stderr:
results and findings, never filtered by level. `io.logger` is a `Log.Logger.INSTANCE` for
diagnostics, scoped to the program name (and the command name when there are several), on stderr
through `@manro/lib-log-server`. Every program takes `--log-level <level>` and
`--log-format <pretty|plain|json>`, which override `LOG_LEVEL` and `LOG_FORMAT`; the default is
lib-log's `DEFAULT_LEVEL` (`info`), `pretty` in interactive mode and `plain` otherwise. When opening
the I/O fails, such as on a bad `LOG_LEVEL`, the runner reports the failure through default I/O and
exits 1. An injected `io` replaces all default I/O.
`select({ message, choicesList: [{ name, value }] })` returns the selected string; prompts render on
stderr. Spinners expose only `stop()`; plain spinners are silent.

`CLI.cliModeResolver.resolve` takes the three TTY flags, a `Cli.Env`, and the parsed `modeFlags`
(`isPlain`, `isInteractive`), and returns `{ mode, isColorEnabled }` without reading the process.
`CLI.cliModeResolver.AGENT_ENV_NAMES_LIST` names the agent markers. `CLI.cliStyle.PLAIN_STYLE`
provides the identity styles; the style names are listed once, in `core/style/cli-style.ts`.

`Cli.Io.mode` is `"plain"` or `"interactive"`. The default selects interactive only when stdin,
stdout and stderr are TTYs, `CI` is unset, `--plain` was not given, and no agent marker
(`CLAUDECODE`, `CODEX_THREAD_ID`, `CURSOR_AGENT`, set to any value) is present. `--interactive`
overrides the agent markers for a person in a shell an agent started; it never overrides the TTY
checks, `CI`, or `--plain`, which wins when both flags are given. The runner defines both flags once
and reads Commander’s parsed values, so an option value spelled `--plain` does not change modes.
Pipes, CI, and agents use plain mode. Commands keep the same flags, work, and exit codes.

`Cli.Io.style` is `Cli.Style`: `success`, `warning`, `failure`, `accent`, `muted`, and `strong` map
text to text. Plain styles return their input. Interactive styles use chalk's detected color level;
setting `NO_COLOR`, including to an empty string, makes styles return their input while spinners and
prompts still run. Only the CLI layer styles command results; JSON stays unstyled. Plain spinners
write nothing. Plain prompts throw `CliUsageError` with
`needs a terminal; pass the choice as flags`.

Used by the skill scripts of agents-infra-audit, claude-skill-links, code-standards,
lint-config-apply, and wiki-lint, and by the validate and build-release scripts. Requires Node
22.18+; builds on `@manro/lib-env`, `@manro/lib-log`, and `@manro/lib-log-server`.

```mermaid
flowchart LR
  runner["core/composer: cli-runner"] --> command["core/command: Commander adapter"]
  runner --> io["core/io: process I/O adapter"]
  runner --> usage["core/usage: CliUsageError"]
  io --> mode["core/mode: mode resolver"]
  io --> style["core/style: chalk adapter"]
  io --> prompts["core/io: ora and inquirer adapters"]
  prompts --> usage
```

Each concept in `core/` holds its types and the adapters that implement them: commander parses argv
in `core/command/`, ora and inquirer serve `core/io/`, and chalk serves `core/style/`. The runner in
`core/composer/` opens the process I/O on first use, once Commander has read the shared flags, and
reports a failure even when opening the I/O failed.

## Tests

`CLI.memoryIo.open({ mode, answersList, defaultAnswer, level })` returns the `io` with
`outputLinesList`, `errorLinesList`, `entriesList`, `promptsList`, and `spinnerCallsList`; in
interactive mode each style wraps its text as `<success>…</success>`.

`pnpm --filter @manro/lib-cli test` checks the runner with memory I/O: dispatch, help, strict
arguments, defaults, repeated options, choices behind a parser, parser validation, and action
failures; the positive whole-number parser runs alone and through the runner. The pure mode
resolver's matrix covers each TTY flag, `CI`, `--plain`, `--interactive`, `NO_COLOR`, and each agent
marker; plain styles are checked as identity functions, and a built style covers every style name.
Marker styles check interactive help and errors through `CLI.cliRunner.runCli`. Repository smoke
checks exercise the default streams, pseudo-terminal check and apply runs, and standalone skill
bundles without `node_modules`.
