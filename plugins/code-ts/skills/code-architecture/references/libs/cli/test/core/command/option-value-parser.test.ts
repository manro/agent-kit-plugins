import assert from "node:assert/strict";
import { test } from "node:test";

import { CLI } from "#cli/index.ts";

const parseLineWidth = CLI.optionValueParser.buildPositiveWholeNumberParser({
  flagName: "--line-width",
  unitName: "columns"
});

test("a positive whole number parses to its number", () => {
  assert.equal(parseLineWidth("1"), 1);
  assert.equal(parseLineWidth("100"), 100);
});

test("zero, a sign, a fraction, or text is a usage error naming the flag and the unit", () => {
  for (const text of ["0", "-1", "+1", "1.5", "07", "ten", ""]) {
    assert.throws(() => parseLineWidth(text), {
      name: "CliUsageError",
      message: "--line-width requires a positive whole number of columns"
    });
  }
});

test("a bad value through the runner prints the message and the usage", async () => {
  const fixture = CLI.memoryIo.open();
  const exitCode = await CLI.cliRunner.runCli({
    name: "tool",
    summary: "Test tool",
    argvSource: { argv: ["node", "tool", "--line-width", "0"] },
    commandsList: [
      {
        name: "lint",
        summary: "Lint",
        optionsList: [
          { flags: "--line-width <chars>", description: "Width", parseValue: parseLineWidth }
        ],
        run: () => CLI.CLI_EXIT_CODES.done
      }
    ],
    io: fixture.io
  });

  assert.equal(exitCode, CLI.CLI_EXIT_CODES.failed);
  assert.match(
    fixture.errorLinesList.join("\n"),
    /^--line-width requires a positive whole number of columns\nUsage: tool/
  );
});
