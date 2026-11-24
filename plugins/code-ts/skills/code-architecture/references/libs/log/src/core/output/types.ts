declare module "@manro/lib-log" {
  namespace Log {
    /**
     * Where a command's results go: written verbatim, never prefixed, styled, or filtered by log
     * level, so callers can parse them and regression gates can compare them byte for byte.
     */
    interface Output {
      writeLine(text: string): void;
      write(text: string): void;
    }
  }
}

export {};
