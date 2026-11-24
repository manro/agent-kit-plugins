/** Bad or missing flags: the caller fixes them; the runner prints the usage after the message. */
export default class CliUsageError extends Error {
  override readonly name = "CliUsageError";
}

declare module "@manro/lib-cli" {
  namespace Cli.CliUsageError {
    type INSTANCE = CliUsageError;
  }
}
