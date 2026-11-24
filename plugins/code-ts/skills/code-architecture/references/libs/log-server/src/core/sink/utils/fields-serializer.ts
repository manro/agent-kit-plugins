/**
 * Turns log fields into JSON that always serializes: an Error keeps its name, message, stack, and
 * cause; a BigInt becomes its digits; a value that contains itself becomes `[Circular]`.
 */

import { LOG, type Log } from "@manro/lib-log";

function getIsObject(candidate: unknown): candidate is object {
  return candidate !== null && typeof candidate === "object";
}

function getHasToJson(candidate: object): candidate is { toJSON: () => unknown } {
  return typeof (candidate as { toJSON?: unknown }).toJSON === "function";
}

function buildErrorMap(
  error: Error,
  walkChild: Log.ValueWalker.WalkChild
): Record<string, unknown> {
  const errorMap: Record<string, unknown> = {
    name: error.name,
    message: error.message,
    stack: error.stack
  };

  if (error.cause !== undefined) {
    errorMap.cause = walkChild(error.cause);
  }

  for (const [key, fieldValue] of Object.entries(error)) {
    errorMap[key] ??= walkChild(fieldValue);
  }

  return errorMap;
}

function convertNode(nodeValue: unknown, walkChild: Log.ValueWalker.WalkChild): unknown {
  if (typeof nodeValue === "bigint") {
    return nodeValue.toString();
  }

  if (!getIsObject(nodeValue)) {
    return nodeValue;
  }

  if (nodeValue instanceof Error) {
    return buildErrorMap(nodeValue, walkChild);
  }

  // Its result is converted too: a BigInt or a cycle in it would make JSON.stringify throw.
  if (getHasToJson(nodeValue)) {
    return walkChild(nodeValue.toJSON());
  }

  return Array.isArray(nodeValue)
    ? nodeValue.map(elementValue => walkChild(elementValue))
    : Object.fromEntries(
        Object.entries(nodeValue).map(([key, fieldValue]) => [key, walkChild(fieldValue)])
      );
}

/** One field value as JSON text. */
function formatFieldValue(fieldValue: unknown): string {
  return JSON.stringify(LOG.valueWalker.walkValue(fieldValue, convertNode)) ?? String(fieldValue);
}

/** Fields as plain JSON values, safe for JSON.stringify. */
function toJsonFieldsMap(fieldsMap: Log.Fields): Record<string, unknown> {
  return LOG.valueWalker.walkValue(fieldsMap, convertNode) as Record<string, unknown>;
}

export default { formatFieldValue, toJsonFieldsMap };
