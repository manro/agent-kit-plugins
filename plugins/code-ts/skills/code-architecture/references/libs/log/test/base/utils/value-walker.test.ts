import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG, type Log } from "#log/index.ts";

const copyNode: Log.ValueWalker.ConvertNode = (nodeValue, walkChild) =>
  nodeValue !== null && typeof nodeValue === "object"
    ? Object.fromEntries(
        Object.entries(nodeValue).map(([key, childValue]) => [key, walkChild(childValue)])
      )
    : nodeValue;

test("every value, a primitive included, goes through the conversion", () => {
  const convertedValue = LOG.valueWalker.walkValue({ a: 1, b: { c: 2 } }, (nodeValue, walkChild) =>
    typeof nodeValue === "number" ? nodeValue * 10 : copyNode(nodeValue, walkChild)
  );

  assert.deepEqual(convertedValue, { a: 10, b: { c: 20 } });
});

test("an object met again inside itself becomes [Circular]", () => {
  const loopMap: Record<string, unknown> = { name: "loop" };

  loopMap.self = { parent: loopMap };

  assert.deepEqual(LOG.valueWalker.walkValue(loopMap, copyNode), {
    name: "loop",
    self: { parent: "[Circular]" }
  });
});

test("an object shared by two siblings is walked both times", () => {
  const sharedMap = { count: 1 };

  assert.deepEqual(LOG.valueWalker.walkValue({ a: sharedMap, b: sharedMap }, copyNode), {
    a: { count: 1 },
    b: { count: 1 }
  });
});
