import type { Env } from "#env/index.ts";

/** A switch: true when the variable is set to anything, an empty string included. */
function buildFlagField(): Env.Field<boolean> {
  return { read: rawValue => ({ value: rawValue !== undefined }) };
}

/** One of `valuesList`; empty or unset is undefined, anything else fails. */
function buildOneOfField<T extends string>(valuesList: readonly T[]): Env.Field<T | undefined> {
  return {
    read: rawValue => {
      if (rawValue === undefined || rawValue === "") {
        return { value: undefined };
      }

      const matchedValue = valuesList.find(candidate => candidate === rawValue);

      return matchedValue === undefined
        ? { problem: `must be one of ${valuesList.join(", ")}, got "${rawValue}"` }
        : { value: matchedValue };
    }
  };
}

/** Free text; empty or unset is undefined. */
function buildTextField(): Env.Field<string | undefined> {
  return { read: rawValue => ({ value: rawValue === "" ? undefined : rawValue }) };
}

export default { buildFlagField, buildOneOfField, buildTextField };

declare module "@manro/lib-env" {
  namespace Env {
    /** A value, or why the raw value is refused. */
    type Reading<T> = { readonly value: T } | { readonly problem: string };

    type Field<T> = {
      readonly read: (rawValue: string | undefined) => Reading<T>;
    };
  }
}
