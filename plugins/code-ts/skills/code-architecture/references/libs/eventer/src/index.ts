import EventerBase from "#eventer/core/eventer/eventer-base.ts";
import EventerStandalone from "#eventer/core/eventer/eventer-standalone.ts";

export const EVENTER = { EventerBase, EventerStandalone } as const;

export namespace Eventer {}
