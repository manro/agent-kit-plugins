import assert from "node:assert/strict";
import { test } from "node:test";

import { CLI } from "#cli/index.ts";

const AGENT_NAMES_LIST = [undefined, ...CLI.cliModeResolver.AGENT_ENV_NAMES_LIST];

test("three terminals, no CI, no --plain, and no agent unless --interactive enable interaction", () => {
  for (const isStdinTty of [false, true]) {
    for (const isStdoutTty of [false, true]) {
      for (const isStderrTty of [false, true]) {
        for (const isPlain of [false, true]) {
          for (const isInteractive of [false, true]) {
            for (const ci of [undefined, "", "true"]) {
              for (const noColor of [undefined, "", "1"]) {
                for (const agentName of AGENT_NAMES_LIST) {
                  const envMap = {
                    CI: ci,
                    NO_COLOR: noColor,
                    ...(agentName ? { [agentName]: "1" } : {})
                  };

                  const input = {
                    isStdinTty,
                    isStdoutTty,
                    isStderrTty,
                    env: CLI.envService.read(envMap),
                    modeFlags: { isPlain, isInteractive }
                  };

                  const mode =
                    isStdinTty &&
                    isStdoutTty &&
                    isStderrTty &&
                    ci === undefined &&
                    !isPlain &&
                    (agentName === undefined || isInteractive)
                      ? "interactive"
                      : "plain";

                  assert.deepEqual(
                    CLI.cliModeResolver.resolve(input),
                    { mode, isColorEnabled: mode === "interactive" && noColor === undefined },
                    JSON.stringify(input)
                  );
                }
              }
            }
          }
        }
      }
    }
  }
});

test("an agent's variable with an empty value still marks the agent", () => {
  const { mode } = CLI.cliModeResolver.resolve({
    isStdinTty: true,
    isStdoutTty: true,
    isStderrTty: true,
    env: CLI.envService.read({ CURSOR_AGENT: "" }),
    modeFlags: { isPlain: false, isInteractive: false }
  });

  assert.equal(mode, "plain");
});
