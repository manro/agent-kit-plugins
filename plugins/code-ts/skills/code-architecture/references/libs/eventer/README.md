# @manro/lib-eventer

Typed publish-subscribe. A class that announces what happens to it — progress, a state change, a
step that needs the user — extends `EventerBase` with a map of event names to listener signatures
and calls `emit`; whoever holds it subscribes, without the class knowing who listens or how many.

| `EVENTER.`          | Holds                                                           |
| ------------------- | --------------------------------------------------------------- |
| `EventerBase`       | Abstract base: a protected `emit` and the public subscribe side |
| `EventerStandalone` | The same with a public `emit`: a channel no single class owns   |

The subscribe side is `addEventListener`, `addOnceEventListener`, `removeEventListener`, and
`removeAllEventListeners`. `Eventer.ListenersMap` constrains a listeners map;
`Eventer.Listenable<Listeners>` is the subscribe side alone, for a role interface the publisher
implements.

```ts
import { EVENTER, type Eventer } from "@manro/lib-eventer";

type DownloadListeners = { progress: (doneMs: number) => void };

interface Download extends Eventer.Listenable<DownloadListeners> {
  run(url: string): Promise<void>;
}

class HttpDownload extends EVENTER.EventerBase<DownloadListeners> implements Download {
  async run(url: string): Promise<void> {
    this.emit("progress", 0);
  }
}

download.addEventListener("progress", doneMs => progressObserver.advance(doneMs));
```

- **Subscribe once, where the publisher is wired.** A listener outlives the call that triggered the
  event; adding one per call stacks them.
- **One instance, one stream.** Two calls running at once on one publisher emit into the same
  listeners; a stream that belongs to one call stays a parameter of that call.
- **No reserved names.** node:events throws when an `error` event has no listener, and emits
  `newListener` and `removeListener` itself with its own arguments, so the map type refuses all
  three.

Fills the event lib role of `code-architecture` § Lib roles; no agent-kit package uses it yet.
Depends on node:events. Node only.
