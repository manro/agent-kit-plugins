import assert from "node:assert/strict";
import { test } from "node:test";
import { stripVTControlCharacters } from "node:util";

import { LOG, type Log } from "@manro/lib-log";

import { LOG_SERVER, type LogServer } from "#log-server/index.ts";

const NOW_MS = new Date(2026, 0, 2, 3, 4, 5, 6).getTime();

function capture(
  format: LogServer.Format,
  isColored = false
): { logger: Log.Logger.INSTANCE; readText: () => string } {
  let text = "";

  const sink = new LOG_SERVER.StreamSink(
    { format, isColored, stream: { write: (chunk: string) => (text += chunk) } },
    { getNowMs: () => NOW_MS }
  );

  const logger = new LOG.Logger({ level: "trace", scope: "tool", sink }).createChild("build");

  return { logger, readText: () => text };
}

test("plain is one line: level, scope, message, fields", () => {
  const { logger, readText } = capture("plain");

  logger.warn("deck has 12 slides");
  logger.info("rendered", { pages: 3 });

  assert.equal(
    readText(),
    'WARN: tool build: deck has 12 slides\nINFO: tool build: rendered {"pages":3}\n'
  );
});

test("pretty carries the time and puts fields and stacks under the message", () => {
  const { logger, readText } = capture("pretty");

  logger.error("render failed", { pdf: "a.pdf", err: new Error("boom") });

  const [headLine, pdfLine, errLine] = readText().split("\n");

  assert.equal(headLine, "[03:04:05.006] ERROR: tool build render failed");
  assert.equal(pdfLine, '    pdf: "a.pdf"');
  assert.match(errLine ?? "", /^ {4}err: Error: boom$/);
});

test("color is the caller's decision, and json never carries it", () => {
  const getIsColored = (text: string): boolean => stripVTControlCharacters(text) !== text;
  const prettyCapture = capture("pretty", true);
  const jsonCapture = capture("json", true);

  prettyCapture.logger.warn("slow");

  jsonCapture.logger.warn("slow");

  assert.equal(getIsColored(prettyCapture.readText()), true);
  assert.equal(getIsColored(capture("plain").readText()), false);
  assert.equal(getIsColored(jsonCapture.readText()), false);
});

test("json is one object per line; core keys win over fields", () => {
  const { logger, readText } = capture("json");

  logger.info("hello", { n: 1, msg: "shadow" });

  assert.deepEqual(JSON.parse(readText()), {
    level: "info",
    time: new Date(NOW_MS).toISOString(),
    scope: "tool build",
    msg: "hello",
    n: 1
  });
});

test("json fields serialize, and credentials stay redacted", () => {
  const { logger, readText } = capture("json");

  logger.error("failed", { count: 10n, headers: { authorization: "Bearer tok-9" } });

  assert.equal((JSON.parse(readText()) as { count: unknown }).count, "10");
  assert.ok(!readText().includes("tok-9"));
});
