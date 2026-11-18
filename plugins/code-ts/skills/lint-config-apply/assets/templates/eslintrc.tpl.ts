import type { Linter } from "eslint";

import { SHARED_RULES_MAP, SHARED_TYPE_AWARE_RULES_MAP } from "./lint-rules.tpl.ts";

export const SHARED_LEGACY_CONFIG: Linter.LegacyConfig = {
  root: true,
  env: { node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: 2022, sourceType: "module" },
  plugins: ["@typescript-eslint", "simple-import-sort", "unused-imports", "prettier"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
  rules: { ...SHARED_RULES_MAP },
  overrides: [
    {
      files: ["**/*.ts", "**/*.tsx"],
      parserOptions: { projectService: true },
      rules: { ...SHARED_TYPE_AWARE_RULES_MAP }
    }
  ]
};
