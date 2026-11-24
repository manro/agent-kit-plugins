import type { Cli } from "#cli/index.ts";

const STYLE_NAMES_LIST = ["success", "warning", "failure", "accent", "muted", "strong"] as const;

/** A style that renders each of its names through `formatStyled`. */
function buildStyle(formatStyled: Cli.CliStyle.FormatStyled): Cli.Style {
  return Object.fromEntries(
    STYLE_NAMES_LIST.map(styleName => [
      styleName,
      (text: string) => formatStyled({ styleName, text })
    ])
  ) as Cli.Style;
}

/** Every style returns its input. */
const PLAIN_STYLE = buildStyle(({ text }) => text);

export default { buildStyle, PLAIN_STYLE };

declare module "@manro/lib-cli" {
  namespace Cli {
    type StyleName = (typeof STYLE_NAMES_LIST)[number];

    /** Text to text for each style name; a plain style returns its input. */
    type Style = { readonly [Name in StyleName]: (text: string) => string };
  }

  namespace Cli.CliStyle {
    type FormatStyled = (input: { styleName: StyleName; text: string }) => string;
  }
}
