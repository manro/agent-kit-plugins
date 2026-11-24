const CLI_EXIT_CODES = { done: 0, failed: 1, pending: 2 } as const;

export default CLI_EXIT_CODES;

declare module "@manro/lib-cli" {
  namespace Cli {
    type ExitCodes = typeof CLI_EXIT_CODES;
  }
}
