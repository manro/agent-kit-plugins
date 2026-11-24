import EnvError from "#env/core/env/env.error.ts";
import EnvService from "#env/core/env/env.service.ts";
import envFields from "#env/core/env/env-fields.ts";

export const ENV = { EnvError, EnvService, envFields } as const;

export namespace Env {}
