/** `HH:MM:SS` at the start of `Date.prototype.toTimeString()`. */
const CLOCK_CHARS = 8;
const MILLISECONDS_CHARS = 3;

/** `epochMs` as the local wall-clock time, `HH:MM:SS.mmm`. */
function formatClockTime(epochMs: number): string {
  const date = new Date(epochMs);
  const millisecondsText = String(date.getMilliseconds()).padStart(MILLISECONDS_CHARS, "0");

  return `${date.toTimeString().slice(0, CLOCK_CHARS)}.${millisecondsText}`;
}

export default { formatClockTime };
