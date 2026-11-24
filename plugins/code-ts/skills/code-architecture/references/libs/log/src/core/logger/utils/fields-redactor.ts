import valueWalker from "#log/base/utils/value-walker.ts";
import type { Log } from "#log/index.ts";

const REDACTED_TEXT = "[redacted]";
const SECRET_KEY_PATTERN =
  /token|secret|passw|authorization|cookie|api[-_]?key|credential|private[-_]?key/i;

function getIsPlainObject(candidate: unknown): candidate is Record<string, unknown> {
  if (candidate === null || typeof candidate !== "object") {
    return false;
  }

  const prototype: unknown = Object.getPrototypeOf(candidate);

  return prototype === Object.prototype || prototype === null;
}

function redactEntriesList(
  entriesList: readonly [string, unknown][],
  walkChild: Log.ValueWalker.WalkChild
): [string, unknown][] {
  return entriesList.map(([key, fieldValue]) => [
    key,
    SECRET_KEY_PATTERN.test(key) ? REDACTED_TEXT : walkChild(fieldValue)
  ]);
}

/** A copy of the error, same class and stack, with its cause and own fields redacted. */
function redactError(error: Error, walkChild: Log.ValueWalker.WalkChild): Error {
  const redactedError = Object.create(
    Object.getPrototypeOf(error) as object,
    Object.getOwnPropertyDescriptors(error)
  ) as Error;

  // V8's stack accessor reads the original error's internal slot, so the copy holds the text.
  Object.defineProperty(redactedError, "stack", { value: error.stack, configurable: true });

  const ownEntriesList: [string, unknown][] = Object.entries(error);

  if (error.cause !== undefined) {
    ownEntriesList.push(["cause", error.cause]);
  }

  for (const [key, fieldValue] of redactEntriesList(ownEntriesList, walkChild)) {
    Object.defineProperty(redactedError, key, { value: fieldValue, enumerable: key !== "cause" });
  }

  return redactedError;
}

/** Copies plain objects, arrays, and errors; any other value is kept as it is. */
function redactNode(nodeValue: unknown, walkChild: Log.ValueWalker.WalkChild): unknown {
  if (nodeValue instanceof Error) {
    return redactError(nodeValue, walkChild);
  }

  if (Array.isArray(nodeValue)) {
    return nodeValue.map(elementValue => walkChild(elementValue));
  }

  return getIsPlainObject(nodeValue)
    ? Object.fromEntries(redactEntriesList(Object.entries(nodeValue), walkChild))
    : nodeValue;
}

/** A copy of `fieldsMap` with every secret blanked at any depth; the logged values stay intact. */
function redactFieldsMap(fieldsMap: Log.Fields): Log.Fields {
  return valueWalker.walkValue(fieldsMap, redactNode) as Log.Fields;
}

export default { redactFieldsMap };
