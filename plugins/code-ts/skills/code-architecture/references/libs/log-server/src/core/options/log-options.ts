import { ENV } from "@manro/lib-env";
import { LOG, type Log } from "@manro/lib-log";

import logFormatsConfig from "#log-server/config/log-formats.config.ts";
import LogOptionsError from "#log-server/core/options/log-options.error.ts";
import type { LogServer } from "#log-server/index.ts";

/** A flag read like its variable; undefined when it was not given. */
function pickFlagValue<T extends string>({
  flagName,
  flagValue,
  valuesList
}: {
  flagName: string;
  flagValue: string | undefined;
  valuesList: readonly T[];
}): T | undefined {
  const reading = ENV.envFields.buildOneOfField(valuesList).read(flagValue);

  if ("problem" in reading) {
    throw new LogOptionsError(`${flagName} ${reading.problem}`);
  }

  return reading.value;
}

/** Flags override the environment; a terminal gets pretty lines, a pipe or an agent plain ones. */
function parse({ env, flags, isTerminal }: LogServer.OptionsInput): LogServer.Options {
  return {
    level:
      pickFlagValue({
        flagName: "--log-level",
        flagValue: flags.level,
        valuesList: LOG.logLevels.LEVELS_LIST
      }) ??
      env.LOG_LEVEL ??
      LOG.logLevels.DEFAULT_LEVEL,
    format:
      pickFlagValue({
        flagName: "--log-format",
        flagValue: flags.format,
        valuesList: logFormatsConfig.FORMATS_LIST
      }) ??
      env.LOG_FORMAT ??
      (isTerminal ? "pretty" : "plain")
  };
}

export default { parse };

declare module "@manro/lib-log-server" {
  namespace LogServer {
    /** Raw values from the command line; undefined means not given. */
    type Flags = {
      readonly level?: string;
      readonly format?: string;
    };

    type OptionsInput = {
      readonly env: Env;
      readonly flags: Flags;
      /** Whether a person reads the log on a terminal. */
      readonly isTerminal: boolean;
    };

    type Options = {
      readonly level: Log.Level;
      readonly format: Format;
    };
  }
}
