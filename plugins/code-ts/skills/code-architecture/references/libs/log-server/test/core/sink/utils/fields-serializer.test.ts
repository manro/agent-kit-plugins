import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG_SERVER } from "#log-server/index.ts";

const { formatFieldValue, toJsonFieldsMap } = LOG_SERVER.fieldsSerializer;

test("errors with their causes, BigInts, and cycles become JSON values", () => {
  const loopMap: Record<string, unknown> = { name: "loop" };

  loopMap.self = loopMap;

  const jsonMap = toJsonFieldsMap({
    err: new Error("outer", { cause: new Error("inner") }),
    count: 10n,
    loop: loopMap
  });

  const parsedMap = JSON.parse(JSON.stringify(jsonMap)) as {
    err: { name: string; message: string; cause: { message: string }; stack: string };
    count: string;
    loop: unknown;
  };

  assert.equal(parsedMap.err.name, "Error");
  assert.equal(parsedMap.err.message, "outer");
  assert.equal(parsedMap.err.cause.message, "inner");
  assert.match(parsedMap.err.stack, /^Error: outer/);
  assert.equal(parsedMap.count, "10");
  assert.deepEqual(parsedMap.loop, { name: "loop", self: "[Circular]" });
});

test("what toJSON returns is converted too", () => {
  assert.deepEqual(toJsonFieldsMap({ custom: { toJSON: () => ({ count: 2n }) } }), {
    custom: { count: "2" }
  });
});

test("one field value formats as JSON text, and undefined as its name", () => {
  assert.equal(formatFieldValue("a.pdf"), '"a.pdf"');
  assert.equal(formatFieldValue({ count: 3n }), '{"count":"3"}');
  assert.equal(formatFieldValue(undefined), "undefined");
});
