import StreamOutput from "#log-server/core/output/stream-output.ts";

/** Command results go to stdout; usage text and findings go to stderr, whatever the log level. */
export default {
  stderr: new StreamOutput(process.stderr),
  stdout: new StreamOutput(process.stdout)
};
