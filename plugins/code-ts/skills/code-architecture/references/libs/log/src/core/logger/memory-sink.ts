import type { Log } from "#log/index.ts";

class MemorySink implements Log.Sink {
  readonly #entriesList: Log.Entry[] = [];

  get entriesList(): readonly Log.Entry[] {
    return [...this.#entriesList];
  }

  write(logEntry: Log.Entry): void {
    this.#entriesList.push(logEntry);
  }
}

export default MemorySink;

declare module "@manro/lib-log" {
  namespace Log {
    namespace MemorySink {
      type INSTANCE = MemorySink;
    }
  }
}
