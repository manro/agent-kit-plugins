/**
 * Typed publish-subscribe for a class that announces what happens to it: the class extends
 * `EventerBase<Listeners>` and calls `emit`; anyone holding it adds and removes listeners.
 */

import { EventEmitter } from "node:events";

import type { Eventer } from "#eventer/index.ts";

type Listener = (...argsList: never[]) => void;
/** node:events takes untyped handlers; the map typed them on the way in. */
type Handler = (...argsList: unknown[]) => void;

abstract class EventerBase<Listeners extends Eventer.ListenersMap> {
  readonly #emitter = new EventEmitter();

  protected emit<EventName extends keyof Listeners>(
    eventName: EventName,
    ...argsList: Parameters<Listeners[EventName]>
  ): void {
    this.#emitter.emit(eventName as string, ...argsList);
  }

  addEventListener<EventName extends keyof Listeners>(
    eventName: EventName,
    listener: Listeners[EventName]
  ): void {
    this.#emitter.on(eventName as string, listener as unknown as Handler);
  }

  addOnceEventListener<EventName extends keyof Listeners>(
    eventName: EventName,
    listener: Listeners[EventName]
  ): void {
    this.#emitter.once(eventName as string, listener as unknown as Handler);
  }

  removeEventListener<EventName extends keyof Listeners>(
    eventName: EventName,
    listener: Listeners[EventName]
  ): void {
    this.#emitter.off(eventName as string, listener as unknown as Handler);
  }

  removeAllEventListeners(): void {
    this.#emitter.removeAllListeners();
  }
}

export default EventerBase;

declare module "@manro/lib-eventer" {
  namespace Eventer {
    /**
     * Event name to listener. node:events reserves three names: it throws on an `error` event with
     * no listener, and emits `newListener` and `removeListener` itself with its own arguments.
     */
    type ListenersMap = { [eventName: string]: Listener } & {
      error?: never;
      newListener?: never;
      removeListener?: never;
    };

    /** What a holder of the publisher sees: the subscribe side, never `emit`. */
    type Listenable<Listeners extends ListenersMap> = Pick<
      EventerBase<Listeners>,
      | "addEventListener"
      | "addOnceEventListener"
      | "removeEventListener"
      | "removeAllEventListeners"
    >;

    namespace EventerBase {
      type INSTANCE<Listeners extends ListenersMap> = EventerBase<Listeners>;
    }
  }
}
