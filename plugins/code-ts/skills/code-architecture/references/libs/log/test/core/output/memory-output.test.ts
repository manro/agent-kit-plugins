import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG } from "#log/index.ts";

test("memory output keeps the text verbatim and splits it into lines", () => {
  const output = new LOG.MemoryOutput();

  assert.deepEqual(output.linesList, []);

  output.writeLine("a");
  output.write("b");
  output.writeLine("");

  assert.equal(output.text, "a\nb\n");
  assert.deepEqual(output.linesList, ["a", "b"]);
});
