/** An eventer anyone holding it can emit on: a module-level channel no class owns. */

import EventerBase from "#eventer/core/eventer/eventer-base.ts";
import type { Eventer } from "#eventer/index.ts";

class EventerStandalone<Listeners extends Eventer.ListenersMap> extends EventerBase<Listeners> {
  override emit<EventName extends keyof Listeners>(
    eventName: EventName,
    ...argsList: Parameters<Listeners[EventName]>
  ): void {
    super.emit(eventName, ...argsList);
  }
}

export default EventerStandalone;

declare module "@manro/lib-eventer" {
  namespace Eventer {
    namespace EventerStandalone {
      type INSTANCE<Listeners extends ListenersMap> = EventerStandalone<Listeners>;
    }
  }
}
