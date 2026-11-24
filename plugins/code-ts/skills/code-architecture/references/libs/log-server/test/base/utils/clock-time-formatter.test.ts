import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG_SERVER } from "#log-server/index.ts";

test("the clock time is local, two digits a part and three for the milliseconds", () => {
  const { formatClockTime } = LOG_SERVER.clockTimeFormatter;

  assert.equal(formatClockTime(new Date(2026, 0, 2, 3, 4, 5, 6).getTime()), "03:04:05.006");
  assert.equal(formatClockTime(new Date(2026, 0, 2, 13, 14, 15, 160).getTime()), "13:14:15.160");
});
