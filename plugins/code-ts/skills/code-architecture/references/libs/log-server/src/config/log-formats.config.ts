/** How a log line renders: `pretty` styles it for a terminal, `plain` and `json` suit a pipe. */
const FORMATS_LIST = ["pretty", "plain", "json"] as const;

export default { FORMATS_LIST };

declare module "@manro/lib-log-server" {
  namespace LogServer {
    type Format = (typeof FORMATS_LIST)[number];
  }
}
