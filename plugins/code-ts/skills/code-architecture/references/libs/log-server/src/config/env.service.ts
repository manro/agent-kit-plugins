/** The variables the log setup reads; the `--log-level` and `--log-format` flags override them. */

import { ENV, type Env } from "@manro/lib-env";
import { LOG } from "@manro/lib-log";

import logFormatsConfig from "#log-server/config/log-formats.config.ts";

const ENV_SCHEMA = {
  /** The lowest level that reaches the log: `info` when unset. */
  LOG_LEVEL: ENV.envFields.buildOneOfField(LOG.logLevels.LEVELS_LIST),
  /** How each line renders: `pretty` on a terminal, `plain` elsewhere, when unset. */
  LOG_FORMAT: ENV.envFields.buildOneOfField(logFormatsConfig.FORMATS_LIST)
};

const envService: Env.EnvService.INSTANCE<typeof ENV_SCHEMA> = new ENV.EnvService(ENV_SCHEMA);

export default envService;

declare module "@manro/lib-log-server" {
  namespace LogServer {
    type Env = (typeof envService)["values"];
  }
}
