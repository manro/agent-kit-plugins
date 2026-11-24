import type {} from "#log-server/base/types.ts";
import clockTimeFormatter from "#log-server/base/utils/clock-time-formatter.ts";
import envService from "#log-server/config/env.service.ts";
import logFormatsConfig from "#log-server/config/log-formats.config.ts";
import LogOptionsError from "#log-server/core/options/log-options.error.ts";
import logOptions from "#log-server/core/options/log-options.ts";
import standardOutputs from "#log-server/core/output/standard-outputs.adapter.ts";
import StreamOutput from "#log-server/core/output/stream-output.ts";
import StreamSink from "#log-server/core/sink/stream-sink.ts";
import fieldsSerializer from "#log-server/core/sink/utils/fields-serializer.ts";

export const LOG_SERVER = {
  LogOptionsError,
  StreamOutput,
  StreamSink,
  clockTimeFormatter,
  envService,
  fieldsSerializer,
  logFormatsConfig,
  logOptions,
  standardOutputs
} as const;

export namespace LogServer {}
