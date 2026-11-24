import assert from "node:assert/strict";
import { test } from "node:test";

import { CLI, type Cli } from "#cli/index.ts";

function createFixture(mode: Cli.Io["mode"] = "plain") {
  return CLI.memoryIo.open({ mode, defaultAnswer: "repo" });
}

function createCommand(overrides: Partial<Cli.Command> = {}): Cli.Command {
  return { name: "check", summary: "Check things", optionsList: [], run: () => 0, ...overrides };
}

async function runFixture({
  argvList,
  commandsList = [createCommand()],
  mode = "plain"
}: {
  argvList: string[];
  commandsList?: Cli.Command[];
  mode?: Cli.Io["mode"];
}) {
  const fixture = createFixture(mode);

  const exitCode = await CLI.cliRunner.runCli({
    name: "tool",
    summary: "Test tool",
    argvSource: { argv: ["node", "test", ...argvList] },
    commandsList,
    io: fixture.io
  });

  return { ...fixture, exitCode };
}

test("one command accepts flags directly and returns its action's exit code", async () => {
  const command = createCommand({
    optionsList: [
      { flags: "--event-lib <dir>", description: "Event library", defaultValue: "events" }
    ],
    run(values, io) {
      assert.equal(values.eventLib, "custom");

      io.output.writeLine("checked");

      return 2;
    }
  });

  const fixture = await runFixture({ argvList: ["--event-lib=custom"], commandsList: [command] });

  assert.equal(fixture.exitCode, 2);
  assert.deepEqual(fixture.outputLinesList, ["checked"]);
  assert.deepEqual(fixture.errorLinesList, []);
});

test("defaults reach an asynchronous action", async () => {
  const command = createCommand({
    optionsList: [
      { flags: "--project <path>", description: "Config", defaultValue: "tsconfig.json" }
    ],
    async run(values) {
      assert.equal(values.project, "tsconfig.json");

      return 3;
    }
  });

  assert.equal((await runFixture({ argvList: [], commandsList: [command] })).exitCode, 3);
});

test("subcommands dispatch by name", async () => {
  const commandsList = [createCommand(), createCommand({ name: "apply", run: () => 2 })];

  assert.equal((await runFixture({ argvList: ["apply"], commandsList })).exitCode, 2);
});

test("no subcommand and help list the commands on stdout", async () => {
  const commandsList = [createCommand(), createCommand({ name: "apply" })];

  for (const argvList of [[], ["help"], ["--help"], ["-h"]]) {
    const fixture = await runFixture({ argvList, commandsList });

    assert.equal(fixture.exitCode, 0);
    assert.match(fixture.outputLinesList.join("\n"), /check/);
    assert.match(fixture.outputLinesList.join("\n"), /apply/);
    assert.deepEqual(fixture.errorLinesList, []);
  }
});

test("help flags print single-command help without running the action", async () => {
  for (const flag of ["--help", "-h"]) {
    const fixture = await runFixture({
      argvList: [flag],
      commandsList: [
        createCommand({
          run() {
            assert.fail("help ran the action");
          }
        })
      ]
    });

    assert.equal(fixture.exitCode, 0);
    assert.match(fixture.outputLinesList.join("\n"), /Usage: tool/);
    assert.deepEqual(fixture.errorLinesList, []);
  }
});

test("unknown flags, extra arguments and missing values fail on stderr", async () => {
  const command = createCommand({
    optionsList: [{ flags: "--project <path>", description: "Config" }]
  });

  for (const argvList of [["--bogus"], ["extra"], ["--project"]]) {
    const fixture = await runFixture({ argvList, commandsList: [command] });

    assert.equal(fixture.exitCode, 1);
    assert.deepEqual(fixture.outputLinesList, []);
    assert.match(fixture.errorLinesList.join("\n"), /error:/);
    assert.match(fixture.errorLinesList.join("\n"), /Usage:/);
  }
});

test("an unknown subcommand is a usage error", async () => {
  const fixture = await runFixture({
    argvList: ["missing"],
    commandsList: [createCommand(), createCommand({ name: "apply" })]
  });

  assert.equal(fixture.exitCode, 1);
  assert.match(fixture.errorLinesList.join("\n"), /unknown command/);
});

test("repeatable flags accumulate and a parser receives the previous list", async () => {
  const previousList: unknown[] = [];

  const command = createCommand({
    optionsList: [
      {
        flags: "--include <path>",
        description: "Path",
        isRepeatable: true,
        parseValue(text, previous) {
          previousList.push(previous);

          return text.toUpperCase();
        }
      }
    ],
    run(values) {
      assert.deepEqual(values.include, ["FIRST", "SECOND"]);

      return 0;
    }
  });

  const fixture = await runFixture({
    argvList: ["--include", "first", "--include=second"],
    commandsList: [command]
  });

  assert.equal(fixture.exitCode, 0);
  assert.deepEqual(previousList, [undefined, ["FIRST"]]);
});

test("an option with choices refuses any other value, through a parser or repeated", async () => {
  const optionsList: Cli.Option[] = [
    {
      flags: "--size <size>",
      description: "Size",
      choicesList: ["s", "m"],
      parseValue: text => text.toUpperCase()
    },
    { flags: "--tag <tag>", description: "Tag", choicesList: ["a", "b"], isRepeatable: true }
  ];

  const command = createCommand({
    optionsList,
    run(values) {
      assert.deepEqual([values.size, values.tag], ["M", ["a", "b"]]);

      return 0;
    }
  });

  const acceptedFixture = await runFixture({
    argvList: ["--size", "m", "--tag", "a", "--tag", "b"],
    commandsList: [command]
  });

  assert.equal(acceptedFixture.exitCode, 0);

  for (const [argvList, message] of [
    [["--size", "xl"], "error: option '--size <size>' argument 'xl' is invalid."],
    [["--tag", "a", "--tag", "c"], "error: option '--tag <tag>' argument 'c' is invalid."]
  ] as const) {
    const fixture = await runFixture({ argvList: [...argvList], commandsList: [command] });

    assert.equal(fixture.exitCode, 1);
    assert.match(fixture.errorLinesList[0] ?? "", new RegExp(`^${message} Allowed choices are `));
  }
});

test("a parser usage error prints its message and usage", async () => {
  const command = createCommand({
    optionsList: [
      {
        flags: "--number <text>",
        description: "Number",
        parseValue() {
          throw new CLI.CliUsageError("bad number");
        }
      }
    ]
  });

  const fixture = await runFixture({ argvList: ["--number", "oops"], commandsList: [command] });

  assert.equal(fixture.exitCode, 1);
  assert.match(fixture.errorLinesList.join("\n"), /^bad number\nUsage: tool/);
});

test("a command usage error prints that subcommand's usage", async () => {
  const command = createCommand({
    name: "apply",
    run() {
      throw new CLI.CliUsageError("choose a side");
    }
  });

  const fixture = await runFixture({
    argvList: ["apply"],
    commandsList: [createCommand(), command]
  });

  assert.equal(fixture.exitCode, 1);
  assert.match(fixture.errorLinesList.join("\n"), /^choose a side\nUsage: tool apply/);
});

test("a rejected action prints the error message with exit one", async () => {
  const fixture = await runFixture({
    argvList: [],
    commandsList: [
      createCommand({
        async run() {
          throw new Error("failed step");
        }
      })
    ]
  });

  assert.equal(fixture.exitCode, 1);
  assert.deepEqual(fixture.errorLinesList, ["failed step"]);
  assert.deepEqual(fixture.outputLinesList, []);
});

test("a thrown value is reported without terminating the process", async () => {
  const fixture = await runFixture({
    argvList: [],
    commandsList: [
      createCommand({
        run() {
          throw "failed value";
        }
      })
    ]
  });

  assert.equal(fixture.exitCode, 1);
  assert.deepEqual(fixture.errorLinesList, ["failed value"]);
});

test("help styles titles, flags, names and defaults only in interactive mode", async () => {
  const commandsList = [
    createCommand({
      optionsList: [
        { flags: "--project <path>", description: "Config", defaultValue: "tsconfig.json" }
      ]
    }),
    createCommand({ name: "apply" })
  ];

  for (const mode of ["plain", "interactive"] as const) {
    for (const argvList of [["--help"], ["check", "--help"]]) {
      const fixture = await runFixture({ mode, commandsList, argvList });
      const text = fixture.outputLinesList.join("\n");

      assert.equal(fixture.exitCode, 0);
      assert.match(text, /Plain output for scripts and agents/);

      if (mode === "plain") {
        assert.doesNotMatch(text, /<(strong|accent|muted)>/);
      } else {
        assert.match(text, /<strong>Usage:<\/strong>/);
        assert.match(text, /<accent>--plain<\/accent>/);
        assert.match(text, /<accent>tool/);

        if (argvList.length === 1) {
          assert.match(text, /<accent>check<\/accent>/);
        } else {
          assert.match(text, /<muted>\(default:\s+"tsconfig.json"\)<\/muted>/);
        }
      }
    }
  }
});

test("plain is accepted for a single command and before or after a subcommand", async () => {
  for (const commandsList of [
    [createCommand()],
    [createCommand(), createCommand({ name: "apply" })]
  ]) {
    const argsList =
      commandsList.length === 1
        ? [["--plain"]]
        : [
            ["--plain", "check"],
            ["check", "--plain"]
          ];

    for (const argvList of argsList) {
      assert.equal((await runFixture({ commandsList, argvList })).exitCode, 0);
    }

    const helpFixture = await runFixture({ commandsList, argvList: ["--help"] });

    assert.match(helpFixture.outputLinesList.join("\n"), /--plain/);
  }

  const fixture = await runFixture({
    commandsList: [createCommand(), createCommand({ name: "apply" })],
    argvList: ["--plain"]
  });

  assert.match(fixture.outputLinesList.join("\n"), /check/);
});

test("interactive errors style messages as failures and usage as muted", async () => {
  for (const error of [
    new CLI.CliUsageError("choose flags"),
    new Error("failed step"),
    "bad value"
  ]) {
    const fixture = await runFixture({
      mode: "interactive",
      argvList: [],
      commandsList: [
        createCommand({
          run() {
            throw error;
          }
        })
      ]
    });

    const message = error instanceof Error ? error.message : error;

    assert.equal(fixture.exitCode, 1);
    assert.equal(fixture.errorLinesList[0], `<failure>${message}</failure>`);
    assert.deepEqual(
      fixture.errorLinesList.slice(1),
      error instanceof CLI.CliUsageError
        ? ["<muted>Usage: tool [options] (see --help)</muted>"]
        : []
    );
  }

  const parserFixture = await runFixture({ mode: "interactive", argvList: ["--bogus"] });

  assert.equal(
    parserFixture.errorLinesList[0],
    "<failure>error: unknown option '--bogus'</failure>"
  );
  assert.ok(
    parserFixture.errorLinesList.includes("<muted>Usage: tool [options] (see --help)</muted>")
  );
});

test("plain parser errors keep the original help without the runner flag", async () => {
  const fixture = await runFixture({ argvList: ["--bogus"] });

  assert.doesNotMatch(fixture.errorLinesList.join("\n"), /--plain|<failure>|<muted>/);
});

test("usage errors print exactly one diagnostic and one usage line in both modes", async () => {
  const command = createCommand({
    optionsList: [{ flags: "--project <path>", description: "Config" }]
  });

  const casesList = [
    { argvList: ["--bogus"], message: "error: unknown option '--bogus'" },
    {
      argvList: ["extra"],
      message: "error: too many arguments. Expected 0 arguments but got 1: extra."
    },
    { argvList: ["--project"], message: "error: option '--project <path>' argument missing" }
  ];

  for (const mode of ["plain", "interactive"] as const) {
    for (const testCase of casesList) {
      const fixture = await runFixture({
        argvList: testCase.argvList,
        commandsList: [command],
        mode
      });

      assert.equal(fixture.exitCode, 1);
      assert.deepEqual(fixture.outputLinesList, []);
      assert.deepEqual(fixture.errorLinesList, [
        fixture.io.style.failure(testCase.message),
        fixture.io.style.muted("Usage: tool [options] (see --help)")
      ]);
    }
  }
});

test("the runner flattens thrown errors to one line and never adds usage for faults", async () => {
  for (const mode of ["plain", "interactive"] as const) {
    const fixture = await runFixture({
      mode,
      argvList: [],
      commandsList: [
        createCommand({
          run() {
            throw new Error("first\r\nsecond");
          }
        })
      ]
    });

    assert.equal(fixture.exitCode, 1);
    assert.deepEqual(fixture.errorLinesList, [fixture.io.style.failure("first second")]);
  }
});

test("a value spelled plain remains an option value in Commander's parsed values", async () => {
  const command = createCommand({
    optionsList: [{ flags: "--baseline <file>", description: "Baseline" }],
    run(values) {
      assert.equal(values.baseline, "--plain");
      assert.equal(values.plain, undefined);

      return 0;
    }
  });

  assert.equal(
    (await runFixture({ argvList: ["--baseline", "--plain"], commandsList: [command] })).exitCode,
    0
  );
});

test("repeatable defaults are shown in help and replaced by the first explicit value", async () => {
  const optionsList: Cli.Option[] = [
    { flags: "--include <path>", description: "Path", defaultValue: ["src"], isRepeatable: true }
  ];

  for (const argvList of [[], ["--include", "one", "--include", "two"]]) {
    const command = createCommand({
      optionsList,
      run(values) {
        assert.deepEqual(values.include, argvList.length === 0 ? ["src"] : ["one", "two"]);

        return 0;
      }
    });

    assert.equal((await runFixture({ argvList, commandsList: [command] })).exitCode, 0);
  }

  const fixture = await runFixture({
    argvList: ["--help"],
    commandsList: [createCommand({ optionsList })]
  });

  assert.match(fixture.outputLinesList.join("\n"), /default: \["src"\]/);
});
