import assert from "node:assert/strict";
import { test } from "node:test";

import { CLI } from "#cli/index.ts";

test("every plain style returns every byte of its input", () => {
  for (const style of Object.values(CLI.cliStyle.PLAIN_STYLE)) {
    for (const text of ["", "  token  ", "line\nnext\r\n", "\u001b[31mred\u001b[0m", "żółć"]) {
      assert.equal(style(text), text);
    }
  }
});

test("a built style renders every style name through one function, with its name", () => {
  const style = CLI.cliStyle.buildStyle(({ styleName, text }) => `${styleName}:${text}`);

  assert.deepEqual(Object.keys(style), Object.keys(CLI.cliStyle.PLAIN_STYLE));

  for (const [styleName, formatText] of Object.entries(style)) {
    assert.equal(formatText("x"), `${styleName}:x`);
  }
});
