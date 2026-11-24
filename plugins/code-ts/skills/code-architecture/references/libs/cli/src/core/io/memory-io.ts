/**
 * A command's I/O held in memory, for tests: results and errors as lines, log entries as data,
 * every prompt and spinner recorded. Interactive mode tags each style, `<success>text</success>`.
 */

import { LOG, type Log } from "@manro/lib-log";

import cliStyle from "#cli/core/style/cli-style.ts";
import type { Cli } from "#cli/index.ts";

const TAGGED_STYLE = cliStyle.buildStyle(
  ({ styleName, text }) => `<${styleName}>${text}</${styleName}>`
);

function open({
  mode = "plain",
  answersList = [],
  defaultAnswer = "",
  level = "trace"
}: Cli.MemoryIo.Options = {}): Cli.MemoryIo.Result {
  const output = new LOG.MemoryOutput();
  const errorOutput = new LOG.MemoryOutput();
  const sink = new LOG.MemorySink();
  const promptsList: Cli.MemoryIo.Prompt[] = [];
  const spinnerCallsList: string[] = [];

  const io: Cli.Io = {
    output,
    errorOutput,
    logger: new LOG.Logger({ level, sink }),
    mode,
    style: mode === "plain" ? cliStyle.PLAIN_STYLE : TAGGED_STYLE,
    createSpinner: async text => {
      spinnerCallsList.push(text);

      return { stop: () => spinnerCallsList.push("stopped") };
    },
    prompter: {
      select: async prompt => {
        promptsList.push(prompt);

        return answersList[promptsList.length - 1] ?? defaultAnswer;
      }
    }
  };

  // Accessors, so a spread of the result after a run copies what the run wrote.
  return {
    io,
    get outputLinesList() {
      return output.linesList;
    },
    get errorLinesList() {
      return errorOutput.linesList;
    },
    get entriesList() {
      return sink.entriesList;
    },
    get promptsList() {
      return [...promptsList];
    },
    get spinnerCallsList() {
      return [...spinnerCallsList];
    }
  };
}

export default { open };

declare module "@manro/lib-cli" {
  namespace Cli.MemoryIo {
    type Prompt = Parameters<Cli.Prompter["select"]>[0];

    type Options = {
      mode?: Cli.Io["mode"];
      /** The answers to the prompts, in order; then `defaultAnswer`. */
      answersList?: readonly string[];
      defaultAnswer?: string;
      /** The logger's threshold: `trace` by default, so a test sees every entry. */
      level?: Log.Level;
    };

    type Result = {
      readonly io: Cli.Io;
      readonly outputLinesList: readonly string[];
      readonly errorLinesList: readonly string[];
      readonly entriesList: readonly Log.Entry[];
      readonly promptsList: readonly Prompt[];
      readonly spinnerCallsList: readonly string[];
    };
  }
}
