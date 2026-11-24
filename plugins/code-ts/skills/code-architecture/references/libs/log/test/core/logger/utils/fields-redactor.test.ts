import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG } from "#log/index.ts";

const { redactFieldsMap } = LOG.fieldsRedactor;

test("a field whose key names a secret is blanked at any depth", () => {
  const redactedMap = redactFieldsMap({
    access_token: "tok-1",
    headers: { Authorization: "Bearer tok-2", accept: "json" },
    users: [{ name: "a", password: "pw-3" }],
    nested: { a: { b: { c: { token: "deep-1" } } } }
  });

  for (const secret of ["tok-1", "tok-2", "pw-3", "deep-1"]) {
    assert.ok(!JSON.stringify(redactedMap).includes(secret), secret);
  }

  assert.deepEqual(redactedMap.headers, { Authorization: "[redacted]", accept: "json" });
});

test("a value that contains itself is cut, and other objects are kept as they are", () => {
  const loopMap: Record<string, unknown> = { name: "loop" };
  const startedDate = new Date(0);

  loopMap.self = loopMap;

  const redactedMap = redactFieldsMap({ loop: loopMap, started: startedDate });

  assert.deepEqual(redactedMap.loop, { name: "loop", self: "[Circular]" });
  assert.equal(redactedMap.started, startedDate);
});

test("an error keeps its class and stack, its own fields and cause redacted", () => {
  const error = Object.assign(new TypeError("refused", { cause: { token: "tok-4" } }), {
    config: { headers: { authorization: "Bearer tok-5" } }
  });

  const redactedError = redactFieldsMap({ err: error }).err as typeof error;

  assert.ok(redactedError instanceof TypeError);
  assert.equal(redactedError.message, "refused");
  assert.equal(redactedError.stack, error.stack);
  assert.deepEqual(redactedError.cause, { token: "[redacted]" });
  assert.deepEqual(redactedError.config, { headers: { authorization: "[redacted]" } });
});

test("the logged values themselves are untouched", () => {
  const error = new Error("boom", { cause: { token: "tok-6" } });
  const headersMap = { authorization: "Bearer tok-7" };

  redactFieldsMap({ err: error, headers: headersMap });

  assert.deepEqual(error.cause, { token: "tok-6" });
  assert.deepEqual(headersMap, { authorization: "Bearer tok-7" });
});
