declare module "@manro/lib-cli" {
  namespace Cli {
    /** @external Commander owns the option keys. */
    type Values = Record<string, unknown>;

    type Command = {
      readonly name: string;
      readonly summary: string;
      readonly optionsList: readonly Option[];
      run(values: Values, io: Io): number | Promise<number>;
    };

    type Option = {
      readonly flags: string;
      readonly description: string;
      readonly defaultValue?: unknown;
      readonly isRepeatable?: boolean;
      /** The only values the option accepts; any other is a usage error. */
      readonly choicesList?: readonly string[];
      readonly parseValue?: (text: string, previous: unknown) => unknown;
    };
  }
}

export {};
