import type { Cli } from "#cli/index.ts";

/**
 * Variables an agent's client sets on the commands it runs; a TTY alone does not mean a person is
 * there, since Cursor's agent terminal and Codex can run commands on one.
 */
const AGENT_ENV_NAMES_LIST = ["CLAUDECODE", "CODEX_THREAD_ID", "CURSOR_AGENT"] as const;

function resolve({
  isStdinTty,
  isStdoutTty,
  isStderrTty,
  env,
  modeFlags
}: Cli.CliModeResolver.Input): Cli.CliModeResolver.Result {
  const isAgent = AGENT_ENV_NAMES_LIST.some(name => env[name]);

  const mode =
    isStdinTty &&
    isStdoutTty &&
    isStderrTty &&
    !env.CI &&
    !modeFlags.isPlain &&
    (!isAgent || modeFlags.isInteractive)
      ? "interactive"
      : "plain";

  return { mode, isColorEnabled: mode === "interactive" && !env.NO_COLOR };
}

export default { resolve, AGENT_ENV_NAMES_LIST };

declare module "@manro/lib-cli" {
  namespace Cli.CliModeResolver {
    /** `--plain` wins over `--interactive`; `--interactive` only overrides an agent's variables. */
    type ModeFlags = { isPlain: boolean; isInteractive: boolean };
    type Input = {
      isStdinTty: boolean;
      isStdoutTty: boolean;
      isStderrTty: boolean;
      env: Cli.Env;
      modeFlags: ModeFlags;
    };
    type Result = { mode: Cli.Io["mode"]; isColorEnabled: boolean };
  }
}
