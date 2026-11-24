import chalk from "chalk";

import cliStyle from "#cli/core/style/cli-style.ts";
import type { Cli } from "#cli/index.ts";

const CHALK_STYLE: Cli.Style = {
  success: text => chalk.green(text),
  warning: text => chalk.yellow(text),
  failure: text => chalk.red(text),
  accent: text => chalk.cyan(text),
  muted: text => chalk.dim(text),
  strong: text => chalk.bold(text)
};

class ChalkStyle {
  /** chalk's colors at its detected level, or the plain style when color is off. */
  open({ isColorEnabled }: { isColorEnabled: boolean }): Cli.Style {
    return isColorEnabled ? CHALK_STYLE : cliStyle.PLAIN_STYLE;
  }
}

export default new ChalkStyle();
