/** The variables that decide between plain and interactive output. */

import { ENV, type Env } from "@manro/lib-env";

const ENV_SCHEMA = {
  /** Set by CI services: plain output. */
  CI: ENV.envFields.buildFlagField(),
  /** Set to anything, empty included: no color (styles return their input). */
  NO_COLOR: ENV.envFields.buildFlagField(),
  /** Set by Claude Code on the commands its agent runs. */
  CLAUDECODE: ENV.envFields.buildFlagField(),
  /** Set by Codex on the commands its agent runs. */
  CODEX_THREAD_ID: ENV.envFields.buildFlagField(),
  /** Set by Cursor on the commands its agent runs. */
  CURSOR_AGENT: ENV.envFields.buildFlagField()
};

const envService: Env.EnvService.INSTANCE<typeof ENV_SCHEMA> = new ENV.EnvService(ENV_SCHEMA);

export default envService;

declare module "@manro/lib-cli" {
  namespace Cli {
    type Env = (typeof envService)["values"];
  }
}
