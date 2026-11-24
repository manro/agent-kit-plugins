import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG_SERVER } from "#log-server/index.ts";

test("the log variables read into a level and a format", () => {
  assert.deepEqual(LOG_SERVER.envService.read({ LOG_LEVEL: "debug", LOG_FORMAT: "json" }), {
    LOG_LEVEL: "debug",
    LOG_FORMAT: "json"
  });
});

test("an unknown value names the variable and the accepted values", () => {
  assert.throws(
    () => LOG_SERVER.envService.read({ LOG_LEVEL: "loud" }),
    /^EnvError: LOG_LEVEL must be one of trace, .*silent, got "loud"$/
  );
});
