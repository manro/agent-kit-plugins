import assert from "node:assert/strict";
import { test } from "node:test";

import { LOG } from "#log/index.ts";

test("entries below the threshold never reach the sink", () => {
  const sink = new LOG.MemorySink();
  const logger = new LOG.Logger({ level: "warn", sink });

  logger.debug("hidden");
  logger.info("hidden");
  logger.warn("shown");
  logger.fatal("shown too");

  assert.deepEqual(
    sink.entriesList.map(e => e.level),
    ["warn", "fatal"]
  );

  assert.equal(logger.getIsEnabled("info"), false);
  assert.equal(logger.getIsEnabled("error"), true);
});

test("a logger without a level logs from info up", () => {
  const logger = new LOG.Logger({ sink: new LOG.MemorySink() });

  assert.equal(logger.level, "info");
  assert.equal(logger.getIsEnabled("debug"), false);
});

test("silent drops everything", () => {
  const sink = new LOG.MemorySink();
  const logger = new LOG.Logger({ level: "silent", sink });

  logger.fatal("nobody hears this");

  assert.equal(sink.entriesList.length, 0);
  assert.equal(LOG.Logger.createSilent().getIsEnabled("fatal"), false);
});

test("a child appends its scope and merges its fields over the parent's", () => {
  const sink = new LOG.MemorySink();
  const rootLogger = new LOG.Logger({ fieldsMap: { run: 1, job: "a" }, scope: "tool", sink });
  const childLogger = rootLogger.createChild("build").createChild("diagrams", { job: "b" });

  childLogger.info("rendered", { count: 3 });

  assert.equal(childLogger.scope, "tool build diagrams");
  assert.deepEqual(sink.entriesList[0], {
    level: "info",
    scope: "tool build diagrams",
    message: "rendered",
    fieldsMap: { run: 1, job: "b", count: 3 }
  });

  assert.equal(new LOG.Logger({ sink }).createChild("solo").scope, "solo");
});

test("bound and passed credentials never reach the sink", () => {
  const sink = new LOG.MemorySink();
  const logger = new LOG.Logger({ fieldsMap: { apiKey: "bound-key" }, sink });

  logger.error("request failed", { access_token: "tok-1", accept: "json" });

  assert.deepEqual(sink.entriesList[0]?.fieldsMap, {
    apiKey: "[redacted]",
    access_token: "[redacted]",
    accept: "json"
  });
});
