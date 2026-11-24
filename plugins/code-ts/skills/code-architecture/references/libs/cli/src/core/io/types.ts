import type { Log } from "@manro/lib-log";

declare module "@manro/lib-cli" {
  namespace Cli {
    type Io = {
      /** The command's results on stdout, verbatim. */
      readonly output: Log.Output;
      /** Usage text and findings on stderr, whatever the log level. */
      readonly errorOutput: Log.Output;
      /** Diagnostics on stderr, scoped to the program and command, filtered by `--log-level`. */
      readonly logger: Log.Logger.INSTANCE;
      readonly mode: "plain" | "interactive";
      readonly style: Style;
      readonly createSpinner: (text: string) => Promise<Spinner>;
      readonly prompter: Prompter;
    };

    type Spinner = {
      readonly stop: () => void;
    };

    type Prompter = {
      select(options: {
        message: string;
        choicesList: readonly { name: string; value: string }[];
      }): Promise<string>;
    };
  }
}

export {};
