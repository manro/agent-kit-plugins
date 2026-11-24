/**
 * The process environment, read through a package's schema, so one module knows each variable's
 * name and kind. The only module that reads `process.env`.
 */

import { ENV, type Env } from "#env/index.ts";

class EnvService<S extends Env.Schema> {
  readonly #schemaMap: S;

  #values: Env.Values<S> | undefined;

  constructor(schemaMap: S) {
    this.#schemaMap = schemaMap;
  }

  /** This process's variables, read on first use so a bad one fails inside a command. */
  get values(): Env.Values<S> {
    return (this.#values ??= this.read(process.env));
  }

  /** Reads `envMap` through the schema; one EnvError names every refused variable. */
  read(envMap: Env.Source): Env.Values<S> {
    const valuesMap: Record<string, unknown> = {};
    const problemsList: string[] = [];

    for (const [name, field] of Object.entries(this.#schemaMap)) {
      const reading = field.read(envMap[name]);

      if ("problem" in reading) {
        problemsList.push(`${name} ${reading.problem}`);
      } else {
        valuesMap[name] = reading.value;
      }
    }

    if (problemsList.length > 0) {
      throw new ENV.EnvError(problemsList.join("; "));
    }

    return valuesMap as Env.Values<S>;
  }
}

export default EnvService;

declare module "@manro/lib-env" {
  namespace Env {
    /** Raw variables: `process.env`, or a test's stand-in. */
    type Source = Readonly<Record<string, string | undefined>>;

    /** Variable name to its field, each with a one-line comment on what it does. */
    type Schema = Readonly<Record<string, Field<unknown>>>;

    type Values<S extends Schema> = {
      readonly [Name in keyof S]: S[Name] extends Field<infer T> ? T : never;
    };

    namespace EnvService {
      type INSTANCE<S extends Schema = Schema> = EnvService<S>;
    }
  }
}
