declare module "@manro/lib-log-server" {
  namespace LogServer {
    /** `process.stdout`, `process.stderr`, or a test's stand-in. */
    type TextStream = {
      write(text: string): unknown;
    };
  }
}

export {};
