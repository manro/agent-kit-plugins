import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG } from "#log/index.ts";

test("a level passes a threshold at or below it, and silent lets nothing pass", () => {
  const { getIsAtLeast } = LOG.logLevels;

  assert.equal(getIsAtLeast({ level: "warn", threshold: "warn" }), true);
  assert.equal(getIsAtLeast({ level: "error", threshold: "warn" }), true);
  assert.equal(getIsAtLeast({ level: "info", threshold: "warn" }), false);
  assert.equal(getIsAtLeast({ level: "fatal", threshold: "silent" }), false);
});

test("the default threshold is one of the levels", () => {
  assert.ok(LOG.logLevels.LEVELS_LIST.includes(LOG.logLevels.DEFAULT_LEVEL));
});
