import type { Config } from "prettier";

import { INDENT_WIDTH_CHARS, LINE_WIDTH_CHARS } from "./lint-shared.tpl.ts";

export const SHARED_PRETTIER_OPTIONS: Config = {
  printWidth: LINE_WIDTH_CHARS,
  tabWidth: INDENT_WIDTH_CHARS,
  semi: true,
  trailingComma: "none",
  arrowParens: "avoid",
  proseWrap: "always"
};
