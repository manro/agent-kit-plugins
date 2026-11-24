/** A log flag holds a value the logger does not take: fix the flag; a retry fails the same. */
export default class LogOptionsError extends Error {
  override readonly name = "LogOptionsError";
}

declare module "@manro/lib-log-server" {
  namespace LogServer {
    namespace LogOptionsError {
      type INSTANCE = LogOptionsError;
    }
  }
}
