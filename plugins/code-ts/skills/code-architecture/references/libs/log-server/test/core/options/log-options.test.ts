import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG_SERVER } from "#log-server/index.ts";

const { parse } = LOG_SERVER.logOptions;
const readEnv = (envMap: Record<string, string> = {}) => LOG_SERVER.envService.read(envMap);

test("a terminal gets pretty lines and a pipe plain ones, both at info", () => {
  assert.deepEqual(parse({ env: readEnv(), flags: {}, isTerminal: true }), {
    level: "info",
    format: "pretty"
  });

  assert.deepEqual(parse({ env: readEnv(), flags: {}, isTerminal: false }), {
    level: "info",
    format: "plain"
  });
});

test("flags override the environment, which overrides the defaults", () => {
  const env = readEnv({ LOG_LEVEL: "warn", LOG_FORMAT: "json" });

  assert.deepEqual(parse({ env, flags: {}, isTerminal: true }), { level: "warn", format: "json" });
  assert.deepEqual(parse({ env, flags: { level: "debug", format: "plain" }, isTerminal: true }), {
    level: "debug",
    format: "plain"
  });
});

test("an unknown flag value names the flag and the accepted values", () => {
  assert.throws(
    () => parse({ env: readEnv(), flags: { format: "xml" }, isTerminal: false }),
    /^LogOptionsError: --log-format must be one of pretty, plain, json, got "xml"$/
  );

  assert.throws(
    () => parse({ env: readEnv(), flags: { level: "loud" }, isTerminal: false }),
    /^LogOptionsError: --log-level must be one of trace, .*silent, got "loud"$/
  );
});
