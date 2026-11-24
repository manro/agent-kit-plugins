import type { Log } from "@manro/lib-log";

import type { LogServer } from "#log-server/index.ts";

class StreamOutput implements Log.Output {
  readonly #stream: LogServer.TextStream;

  constructor(stream: LogServer.TextStream) {
    this.#stream = stream;
  }

  writeLine(text: string): void {
    this.#stream.write(`${text}\n`);
  }

  write(text: string): void {
    this.#stream.write(text);
  }
}

export default StreamOutput;

declare module "@manro/lib-log-server" {
  namespace LogServer {
    namespace StreamOutput {
      type INSTANCE = StreamOutput;
    }
  }
}
