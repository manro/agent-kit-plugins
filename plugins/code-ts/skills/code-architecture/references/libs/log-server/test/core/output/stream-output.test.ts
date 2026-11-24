import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG_SERVER } from "#log-server/index.ts";

test("a stream output writes text verbatim, a line with its newline", () => {
  let text = "";

  const output = new LOG_SERVER.StreamOutput({
    write: (chunk: string) => (text += chunk)
  });

  output.writeLine('{"a": 1}');
  output.write("# md");

  assert.equal(text, '{"a": 1}\n# md');
});
