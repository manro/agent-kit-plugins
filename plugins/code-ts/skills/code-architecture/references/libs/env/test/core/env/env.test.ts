import assert from "node:assert/strict";
import { test } from "node:test";

import { ENV, type Env } from "#env/index.ts";

/** True only when A and B are the same type. */
type IsEqual<A, B> =
  (<T>(_probe: T) => T extends A ? 1 : 2) extends <T>(_probe: T) => T extends B ? 1 : 2
    ? true
    : false;

const ENV_SCHEMA = {
  MODE: ENV.envFields.buildOneOfField(["fast", "slow"]),
  LABEL: ENV.envFields.buildTextField(),
  QUIET: ENV.envFields.buildFlagField()
};

const envService = new ENV.EnvService(ENV_SCHEMA);

test("each variable's type is its field's", () => {
  const isFieldTyped: IsEqual<
    Env.Values<typeof ENV_SCHEMA>,
    {
      readonly MODE: "fast" | "slow" | undefined;
      readonly LABEL: string | undefined;
      readonly QUIET: boolean;
    }
  > = true;

  assert.equal(isFieldTyped, true);
});

test("variables read into their fields' types; unknown ones are dropped", () => {
  assert.deepEqual(envService.read({ MODE: "fast", LABEL: "draft", HOME: "/home" }), {
    MODE: "fast",
    LABEL: "draft",
    QUIET: false
  });
});

test("one EnvError names every refused variable and the values it accepts", () => {
  const strictService = new ENV.EnvService({
    MODE: ENV.envFields.buildOneOfField(["fast", "slow"]),
    SIZE: ENV.envFields.buildOneOfField(["s", "m"])
  });

  assert.throws(
    () => strictService.read({ MODE: "warp", SIZE: "xl" }),
    (error: Error) =>
      error instanceof ENV.EnvError &&
      error.message ===
        'MODE must be one of fast, slow, got "warp"; SIZE must be one of s, m, got "xl"'
  );
});

test("values reads this process's environment once, through the schema", () => {
  const processService = new ENV.EnvService({ AGENT_KIT_ENV_TEST: ENV.envFields.buildTextField() });

  assert.deepEqual(Object.keys(processService.values), ["AGENT_KIT_ENV_TEST"]);
  assert.equal(processService.values, processService.values);
});
