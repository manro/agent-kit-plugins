import { LOG } from "@manro/lib-log";
import { LOG_SERVER, type LogServer } from "@manro/lib-log-server";

import envService from "#cli/config/env.service.ts";
import inquirerPrompter from "#cli/core/io/inquirer-prompter.adapter.ts";
import oraSpinner from "#cli/core/io/ora-spinner.adapter.ts";
import cliModeResolver from "#cli/core/mode/cli-mode-resolver.ts";
import chalkStyle from "#cli/core/style/chalk-style.adapter.ts";
import type { Cli } from "#cli/index.ts";

class ProcessIo {
  /**
   * The process's streams as a command's I/O. Throws on a bad log flag or `LOG_*` variable; with
   * `logFlags` null it reads neither, so the runner can still report that failure.
   */
  open({ ioFlags, scope }: { ioFlags: Cli.ProcessIo.IoFlags; scope: string }): Cli.Io {
    const { mode, isColorEnabled } = cliModeResolver.resolve({
      isStdinTty: process.stdin.isTTY === true,
      isStdoutTty: process.stdout.isTTY === true,
      isStderrTty: process.stderr.isTTY === true,
      env: envService.values,
      modeFlags: ioFlags.modeFlags
    });

    const logOptions = LOG_SERVER.logOptions.parse(
      ioFlags.logFlags === null
        ? { env: LOG_SERVER.envService.read({}), flags: {}, isTerminal: false }
        : {
            env: LOG_SERVER.envService.values,
            flags: ioFlags.logFlags,
            isTerminal: mode === "interactive"
          }
    );

    const logger = new LOG.Logger({
      level: logOptions.level,
      scope,
      sink: new LOG_SERVER.StreamSink({
        format: logOptions.format,
        isColored: isColorEnabled,
        stream: process.stderr
      })
    });

    return {
      output: LOG_SERVER.standardOutputs.stdout,
      errorOutput: LOG_SERVER.standardOutputs.stderr,
      logger,
      mode,
      style: chalkStyle.open({ isColorEnabled }),
      createSpinner: text => oraSpinner.open({ text, isEnabled: mode === "interactive" }),
      prompter: inquirerPrompter.open({ mode })
    };
  }
}

export default new ProcessIo();

declare module "@manro/lib-cli" {
  namespace Cli.ProcessIo {
    type IoFlags = {
      modeFlags: Cli.CliModeResolver.ModeFlags;
      /** The parsed `--log-*` flags, or null to ignore them and the `LOG_*` variables. */
      logFlags: LogServer.Flags | null;
    };
  }
}
