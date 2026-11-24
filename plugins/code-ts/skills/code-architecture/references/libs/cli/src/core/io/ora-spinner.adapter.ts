import type { Cli } from "#cli/index.ts";

const SILENT_SPINNER: Cli.Spinner = { stop: () => {} };

class OraSpinner {
  async open({ text, isEnabled }: { text: string; isEnabled: boolean }): Promise<Cli.Spinner> {
    if (!isEnabled) {
      return SILENT_SPINNER;
    }

    // Loaded on first use, so plain mode never evaluates ora.
    const { default: ora } = await import("ora");
    const spinner = ora({ text, stream: process.stderr }).start();

    return {
      stop: () => {
        spinner.stop();
      }
    };
  }
}

export default new OraSpinner();
