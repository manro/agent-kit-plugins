import assert from "node:assert/strict";
import { test } from "node:test";

import { EVENTER } from "#eventer/index.ts";

test("a standalone eventer lets its holder emit", () => {
  const eventerStandalone = new EVENTER.EventerStandalone<{ line: (text: string) => void }>();
  const linesList: string[] = [];

  eventerStandalone.addEventListener("line", text => linesList.push(text));
  eventerStandalone.emit("line", "a");

  assert.deepEqual(linesList, ["a"]);
});
