import CliUsageError from "#cli/core/usage/cli-usage.error.ts";

const POSITIVE_WHOLE_NUMBER_PATTERN = /^[1-9]\d*$/;

/** A `parseValue` for a flag that takes a positive whole number of `unitName`. */
function buildPositiveWholeNumberParser({
  flagName,
  unitName
}: {
  flagName: string;
  unitName: string;
}): (text: string) => number {
  return text => {
    if (!POSITIVE_WHOLE_NUMBER_PATTERN.test(text)) {
      throw new CliUsageError(`${flagName} requires a positive whole number of ${unitName}`);
    }

    return Number(text);
  };
}

const optionValueParser = { buildPositiveWholeNumberParser };

export default optionValueParser;
