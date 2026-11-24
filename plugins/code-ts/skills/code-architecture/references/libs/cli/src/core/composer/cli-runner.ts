import CLI_EXIT_CODES from "#cli/core/command/cli-exit-codes.ts";
import cliOptions from "#cli/core/command/cli-options.ts";
import CommanderParser from "#cli/core/command/commander-parser.adapter.ts";
import processIo from "#cli/core/io/process-io.adapter.ts";
import CliUsageError from "#cli/core/usage/cli-usage.error.ts";
import type { Cli } from "#cli/index.ts";

const UNPARSED_IO_FLAGS: Cli.ProcessIo.IoFlags = {
  modeFlags: { isPlain: false, isInteractive: false },
  logFlags: {}
};

async function runCli(options: Cli.CliRunner.Options): Promise<number> {
  const openIo: Cli.CommanderParser.OpenIo = ({ ioFlags, scope }) =>
    options.io ?? processIo.open({ ioFlags, scope });

  let parser: Cli.CommanderParser.INSTANCE | undefined;

  try {
    parser = CommanderParser.open({
      exitCodes: CLI_EXIT_CODES,
      commandsList: options.commandsList,
      name: options.name,
      sharedOptionsList: cliOptions.SHARED_OPTIONS_LIST,
      summary: options.summary,
      openIo
    });

    const outcome = await parser.parse(options.argvSource);

    return outcome.status === "done"
      ? outcome.exitCode
      : await outcome.command.run(outcome.values, parser.io);
  } catch (error) {
    const message = (error instanceof Error ? error.message : String(error)).replace(
      /[\r\n]+/g,
      " "
    );

    const errorIo = openErrorIo({ parser, openIo, programName: options.name });

    errorIo.errorOutput.writeLine(errorIo.style.failure(message));

    if (
      error instanceof CliUsageError ||
      (error instanceof Error && error.name === "CliUsageError")
    ) {
      parser?.writeUsage(errorIo);
    }

    return CLI_EXIT_CODES.failed;
  }
}

/** The I/O to report a failure on, even when the failure was opening the I/O itself. */
function openErrorIo({
  parser,
  openIo,
  programName
}: {
  parser: Cli.CommanderParser.INSTANCE | undefined;
  openIo: Cli.CommanderParser.OpenIo;
  programName: string;
}): Cli.Io {
  try {
    return parser?.io ?? openIo({ ioFlags: UNPARSED_IO_FLAGS, scope: programName });
  } catch {
    return openIo({
      ioFlags: { modeFlags: UNPARSED_IO_FLAGS.modeFlags, logFlags: null },
      scope: programName
    });
  }
}

export default { runCli };

declare module "@manro/lib-cli" {
  namespace Cli.CliRunner {
    type Options = {
      name: string;
      summary: string;
      commandsList: readonly Command[];
      /** `process` in an entry, a stand-in `{ argv }` in a test. */
      argvSource: Cli.CommanderParser.ArgvSource;
      io?: Io;
    };
  }
}
