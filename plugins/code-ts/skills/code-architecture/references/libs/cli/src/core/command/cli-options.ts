import { LOG } from "@manro/lib-log";
import { LOG_SERVER } from "@manro/lib-log-server";

import type { Cli } from "#cli/index.ts";

const PLAIN_OPTION = {
  flags: "--plain",
  description: "Plain output for scripts and agents"
} satisfies Cli.Option;

const INTERACTIVE_OPTION = {
  flags: "--interactive",
  description: "Colors and prompts on a terminal, even in an agent's environment"
} satisfies Cli.Option;

const LOG_LEVEL_OPTION = {
  flags: "--log-level <level>",
  description: `Lowest level logged to stderr (env LOG_LEVEL; default ${LOG.logLevels.DEFAULT_LEVEL})`,
  choicesList: LOG.logLevels.LEVELS_LIST
} satisfies Cli.Option;

const LOG_FORMAT_OPTION = {
  flags: "--log-format <format>",
  description: "Log lines (env LOG_FORMAT; default pretty on a terminal, plain elsewhere)",
  choicesList: LOG_SERVER.logFormatsConfig.FORMATS_LIST
} satisfies Cli.Option;

/** The options every command takes; the runner reads them, never the command. */
const SHARED_OPTIONS_LIST: readonly Cli.Option[] = [
  PLAIN_OPTION,
  INTERACTIVE_OPTION,
  LOG_LEVEL_OPTION,
  LOG_FORMAT_OPTION
];

export default { SHARED_OPTIONS_LIST };
