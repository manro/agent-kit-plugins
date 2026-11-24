import assert from "node:assert/strict";
import { test } from "node:test";

import { ENV } from "#env/index.ts";

test("a flag is set by any value, an empty one included", () => {
  const field = ENV.envFields.buildFlagField();

  assert.deepEqual(field.read(undefined), { value: false });
  assert.deepEqual(field.read(""), { value: true });
  assert.deepEqual(field.read("0"), { value: true });
});

test("a one-of field takes a listed value, reads empty as unset, and refuses the rest", () => {
  const field = ENV.envFields.buildOneOfField(["fast", "slow"]);

  assert.deepEqual(field.read("slow"), { value: "slow" });
  assert.deepEqual(field.read(""), { value: undefined });
  assert.deepEqual(field.read(undefined), { value: undefined });
  assert.deepEqual(field.read("warp"), { problem: 'must be one of fast, slow, got "warp"' });
});

test("a text field keeps its value and reads empty as unset", () => {
  const field = ENV.envFields.buildTextField();

  assert.deepEqual(field.read(" a b "), { value: " a b " });
  assert.deepEqual(field.read(""), { value: undefined });
  assert.deepEqual(field.read(undefined), { value: undefined });
});
