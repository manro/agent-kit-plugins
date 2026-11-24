declare module "@manro/lib-log" {
  namespace Log {
    /** Context beside the message; an `err` field carries an Error for the sink to serialize. */
    type Fields = Readonly<Record<string, unknown>>;

    type Entry = {
      readonly level: EntryLevel;
      readonly scope: string;
      readonly message: string;
      readonly fieldsMap: Fields;
    };

    /** Renders or ships entries; one per destination (a stream, memory). */
    interface Sink {
      write(entry: Entry): void;
    }
  }
}

export {};
