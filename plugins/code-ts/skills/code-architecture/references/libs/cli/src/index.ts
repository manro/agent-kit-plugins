import envService from "#cli/config/env.service.ts";
import CLI_EXIT_CODES from "#cli/core/command/cli-exit-codes.ts";
import optionValueParser from "#cli/core/command/option-value-parser.ts";
import type {} from "#cli/core/command/types.ts";
import cliRunner from "#cli/core/composer/cli-runner.ts";
import memoryIo from "#cli/core/io/memory-io.ts";
import type {} from "#cli/core/io/types.ts";
import cliModeResolver from "#cli/core/mode/cli-mode-resolver.ts";
import cliStyle from "#cli/core/style/cli-style.ts";
import CliUsageError from "#cli/core/usage/cli-usage.error.ts";

export const CLI = {
  CliUsageError,
  cliModeResolver,
  cliRunner,
  cliStyle,
  envService,
  memoryIo,
  optionValueParser,
  CLI_EXIT_CODES
} as const;

export namespace Cli {}
