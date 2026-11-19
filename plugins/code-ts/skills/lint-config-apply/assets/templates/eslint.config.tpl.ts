import { existsSync, readdirSync, readFileSync } from "node:fs";
import { URL } from "node:url";

import eslint from "@eslint/js";
import type { ESLint, Linter, Rule } from "eslint";
import { builtinRules } from "eslint/use-at-your-own-risk";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint, { type ConfigArray } from "typescript-eslint";

import { SHARED_RULES_MAP, SHARED_TYPE_AWARE_RULES_MAP } from "./lint-rules.tpl.ts";

const TS_RULE_PREFIX = "@typescript-eslint/";

/** An import of `layers` through the package's `#<folder>/` alias or a `../` path. */
const getLayerBan = (layersList: readonly string[], message: string) => ({
  regex: `^(#[^/]+/|(\\.\\./)+)(${layersList.join("|")})/`,
  message
});

/** A module imports from its own layer or the ones below: base and config, core, then wiring. */
const LAYER_BLOCKS_LIST = [
  {
    filesList: ["**/src/base/**", "**/src/config/**"],
    exceptFilesList: [],
    ban: getLayerBan(
      ["core", "cli"],
      "base/ and config/ know no concept: import nothing from core/ or cli/."
    )
  },
  {
    filesList: ["**/src/core/**"],
    exceptFilesList: ["**/src/core/composer/**"],
    ban: getLayerBan(
      ["core/composer", "composer", "cli"],
      "A concept never imports the wiring above it: nothing from core/composer/ or cli/."
    )
  },
  {
    filesList: ["**/src/core/composer/**"],
    exceptFilesList: [],
    ban: getLayerBan(
      ["cli"],
      "core/composer/ wires the core; the entry layer in cli/ imports it, not the reverse."
    )
  }
];

export const buildSharedConfigList = ({
  ignoresList = [],
  tsFilesList = ["**/*.ts", "**/*.tsx"]
}: { ignoresList?: string[]; tsFilesList?: string[] } = {}): ConfigArray =>
  tseslint.config(
    { ignores: [...ignoresList] },
    eslint.configs.recommended,
    tseslint.configs.recommended,
    prettierRecommended,
    {
      files: [...tsFilesList],
      languageOptions: { parserOptions: { projectService: true } },
      plugins: { "simple-import-sort": simpleImportSort, "unused-imports": unusedImports },
      rules: { ...SHARED_RULES_MAP, ...SHARED_TYPE_AWARE_RULES_MAP }
    },
    {
      plugins: { layers: buildRuleCopiesPlugin({ "higher-imports": "no-restricted-imports" }) }
    },
    ...LAYER_BLOCKS_LIST.map(({ filesList, exceptFilesList, ban }): Linter.Config => ({
      files: [...filesList],
      ignores: [...exceptFilesList],
      rules: { "layers/higher-imports": ["error", { patterns: [ban] }] }
    }))
  );

/** One ESLint glob per line, in order; blank lines and # comments skipped. */
export const readIgnoreGlobsList = (fileUrl: URL): string[] =>
  readFileSync(fileUrl, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "" && !line.startsWith("#"));

/** The folders under `dirUrl` that hold a package.json, sorted. */
export const readPackageFoldersList = (dirUrl: URL): string[] =>
  readdirSync(dirUrl, { withFileTypes: true })
    .filter(
      entry => entry.isDirectory() && existsSync(new URL(`${entry.name}/package.json`, dirUrl))
    )
    .map(entry => entry.name)
    .sort();

const findRule = (ruleName: string): Rule.RuleModule => {
  const rule = ruleName.startsWith(TS_RULE_PREFIX)
    ? (tseslint.plugin as ESLint.Plugin).rules?.[ruleName.slice(TS_RULE_PREFIX.length)]
    : builtinRules.get(ruleName);

  if (rule === undefined) {
    throw new Error(`No rule ${ruleName} to copy.`);
  }

  return rule as unknown as Rule.RuleModule;
};

/**
 * A plugin of existing rules under new names, one per concern. A later block that sets a rule
 * replaces its whole option list, so a concern on its own copy never restates another's options.
 */
export const buildRuleCopiesPlugin = (
  copiesMap: Readonly<Record<string, string>>
): ESLint.Plugin => ({
  rules: Object.fromEntries(
    Object.entries(copiesMap).map(([copyName, ruleName]) => [copyName, findRule(ruleName)])
  )
});
