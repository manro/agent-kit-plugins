import type { Log } from "#log/index.ts";

class MemoryOutput implements Log.Output {
  #text = "";

  get text(): string {
    return this.#text;
  }

  /** The text split into lines, without the empty one after a final newline. */
  get linesList(): readonly string[] {
    return this.#text === "" ? [] : this.#text.replace(/\n$/, "").split("\n");
  }

  writeLine(text: string): void {
    this.#text += `${text}\n`;
  }

  write(text: string): void {
    this.#text += text;
  }
}

export default MemoryOutput;

declare module "@manro/lib-log" {
  namespace Log {
    namespace MemoryOutput {
      type INSTANCE = MemoryOutput;
    }
  }
}
