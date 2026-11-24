import CliUsageError from "#cli/core/usage/cli-usage.error.ts";
import type { Cli } from "#cli/index.ts";

class InquirerPrompter {
  open({ mode }: { mode: Cli.Io["mode"] }): Cli.Prompter {
    const checkTerminal = (): void => {
      if (mode === "plain") {
        throw new CliUsageError("needs a terminal; pass the choice as flags");
      }
    };

    return {
      select: async ({ message, choicesList }) => {
        checkTerminal();

        // Loaded on first use, so plain mode never evaluates inquirer.
        const { default: select } = await import("@inquirer/select");

        return select({ message, choices: [...choicesList] }, { output: process.stderr });
      }
    };
  }
}

export default new InquirerPrompter();
