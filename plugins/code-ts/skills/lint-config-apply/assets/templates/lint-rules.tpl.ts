import type { Linter } from "eslint";

import { INDENT_WIDTH_CHARS, LINE_WIDTH_CHARS } from "./lint-shared.tpl.ts";

export const SHARED_MAX_LEN_OPTIONS = {
  code: LINE_WIDTH_CHARS,
  tabWidth: INDENT_WIDTH_CHARS,
  ignoreUrls: true,
  ignoreStrings: true,
  ignoreTemplateLiterals: true,
  ignoreRegExpLiterals: true
};

export const SHARED_RESTRICTED_SYNTAX_LIST = [
  {
    selector:
      ":matches(ImportDeclaration, ExportNamedDeclaration, ExportAllDeclaration, ImportExpression)[source.value=/^[.#~].*\\.js$/]",
    message: "Import the .ts file itself, not NodeNext's .js output name."
  },
  {
    selector:
      ":matches(MethodDefinition[kind!='constructor'], PropertyDefinition, TSParameterProperty)[accessibility='private']",
    message:
      "Use an ES private member (#name), not the TypeScript private keyword; only a constructor stays private."
  },
  {
    selector:
      ":matches(MethodDefinition[kind='method'][value.params.length>0][value.returnType.typeAnnotation.type='TSBooleanKeyword'], TSMethodSignature[params.length>0][returnType.typeAnnotation.type='TSBooleanKeyword'])[key.name!=/^getIs[A-Z]/]",
    message: "A boolean query with parameters is named getIs…(…)."
  },
  {
    selector:
      ":matches(MethodDefinition[kind='method'][value.params.length=0]:matches([key.name=/^get[A-Z]/], [value.returnType.typeAnnotation.type='TSBooleanKeyword']), TSMethodSignature[params.length=0]:matches([key.name=/^get[A-Z]/], [returnType.typeAnnotation.type='TSBooleanKeyword']))",
    message:
      "A query without parameters is an accessor: get x() or get isX(); an interface declares it readonly x."
  },
  {
    selector:
      "MethodDefinition[kind='get'][value.returnType.typeAnnotation.type='TSBooleanKeyword'][key.name!=/^is[A-Z]/]",
    message: "A boolean accessor is named is…"
  },
  {
    selector:
      ":matches(MethodDefinition[value.returnType.typeAnnotation.type='TSVoidKeyword'], TSMethodSignature[returnType.typeAnnotation.type='TSVoidKeyword'])[key.name=/^get[A-Z]/]",
    message: "A get… method is a query and returns a value; a command keeps its verb."
  },
  {
    selector: "ExportDefaultDeclaration > ObjectExpression > SpreadElement",
    message: "A module default-exports its own values, never a spread."
  }
];

export const SHARED_RULES_MAP: Linter.RulesRecord = {
  "prettier/prettier": "error",
  "simple-import-sort/imports": "error",
  "no-duplicate-imports": "error",
  curly: ["error", "all"],
  eqeqeq: ["error", "always"],
  "@typescript-eslint/consistent-type-imports": [
    "error",
    {
      prefer: "type-imports",
      fixStyle: "inline-type-imports"
    }
  ],
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/ban-ts-comment": "off",
  "@typescript-eslint/no-empty-function": "off",
  "@typescript-eslint/no-namespace": "off",
  "@typescript-eslint/no-non-null-assertion": "off",
  "@typescript-eslint/no-unused-vars": "off",
  "unused-imports/no-unused-imports": "error",
  "unused-imports/no-unused-vars": [
    "warn",
    {
      argsIgnorePattern: "^_"
    }
  ],
  "max-len": ["error", SHARED_MAX_LEN_OPTIONS],
  "no-restricted-syntax": ["error", ...SHARED_RESTRICTED_SYNTAX_LIST]
};

export const SHARED_TYPE_AWARE_RULES_MAP: Linter.RulesRecord = {
  "@typescript-eslint/prefer-nullish-coalescing": "error",
  "@typescript-eslint/prefer-optional-chain": "error",
  "@typescript-eslint/no-unnecessary-type-parameters": "error"
};
