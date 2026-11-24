# Workers

How the rules of `SKILL.md` § Work off the main thread look in browser code. A Node `worker_threads`
worker has the same shape: `parentPort` in place of `self`, `error` and `exit` events on the owner's
side, and a `terminate()` that finishes later. How a bundler builds a worker file is the bundler's
part (`react-architecture` references/web-build.md § Workers).

Worker files typecheck in a project of their own with the `WebWorker` lib, since the DOM lib types
`self` as a window. The messages below travel on a worker's own channel, so they are typed only.

## A timer worker for hidden-tab loops

```ts
// timer-worker.contract.ts
export type TimerCommand = { kind: "start"; intervalMs: number } | { kind: "stop" };
export type TimerTick = { kind: "tick" };
```

```ts
// timer.worker.ts
import type { TimerCommand, TimerTick } from "./timer-worker.contract";

const TICK: TimerTick = { kind: "tick" };

let interval: ReturnType<typeof setInterval> | undefined;

self.addEventListener("message", (event: MessageEvent<TimerCommand>) => {
  clearInterval(interval);
  interval =
    event.data.kind === "start"
      ? setInterval(() => self.postMessage(TICK), event.data.intervalMs)
      : undefined;
});
```

```ts
// timer-worker.adapter.ts
import type { TimerCommand } from "./timer-worker.contract";

type Deps = { createWorker: () => Worker };
type Options = { intervalMs?: number };
type Registration = { readonly listener: () => void };

const DEFAULT_INTERVAL_MS = 1000 / 30;

/** One worker's ticks, shared by every loop that keeps time while the page is hidden. */
export class TimerWorkerAdapter {
  readonly #createWorker: () => Worker;
  readonly #intervalMs: number;
  readonly #registrations = new Set<Registration>();

  #worker: Worker | null = null;

  constructor(deps: Deps, options?: Options) {
    this.#createWorker = deps.createWorker;
    this.#intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  }

  /** Calls `listener` on every tick until the returned function is called. */
  subscribe(listener: () => void): () => void {
    const registration: Registration = { listener };
    this.#registrations.add(registration);
    if (this.#registrations.size === 1) {
      try {
        this.#sendCommand({ kind: "start", intervalMs: this.#intervalMs });
      } catch (error) {
        this.#registrations.delete(registration);
        throw error;
      }
    }
    return () => {
      if (this.#registrations.delete(registration) && this.#registrations.size === 0) {
        this.#sendCommand({ kind: "stop" });
      }
    };
  }

  /** Ends the ticks and the worker; a later subscription starts a new worker. */
  dispose(): void {
    this.#registrations.clear();
    this.#worker?.terminate();
    this.#worker = null;
  }

  #sendCommand(command: TimerCommand): void {
    this.#worker ??= this.#startWorker();
    this.#worker.postMessage(command);
  }

  #startWorker(): Worker {
    const worker = this.#createWorker();
    worker.addEventListener("message", () => {
      for (const { listener } of [...this.#registrations]) listener();
    });
    return worker;
  }
}
```

Each subscription is its own registration, so one listener subscribed twice ends one subscription at
a time. A tick still queued when the last subscription ends can reach the next one: one extra
wakeup, which a step that works from the clock ignores.

```ts
// cadence-loop.adapter.ts
type TickSource = { subscribe(listener: () => void): () => void };
type Deps = { tickSource: TickSource; step: (nowMs: number) => void };

/** Runs `step` on animation frames while the page is visible and on worker ticks while hidden. */
export class CadenceLoopAdapter {
  readonly #tickSource: TickSource;
  readonly #step: (nowMs: number) => void;

  #listening: AbortController | null = null;
  #sourceId = 0;
  #frameId = 0;
  #unsubscribeTicks: (() => void) | null = null;

  constructor(deps: Deps) {
    this.#tickSource = deps.tickSource;
    this.#step = deps.step;
  }

  start(): void {
    if (this.#listening) return;
    this.#listening = new AbortController();
    document.addEventListener("visibilitychange", () => this.#selectSource(), {
      signal: this.#listening.signal
    });
    this.#selectSource();
  }

  dispose(): void {
    this.#listening?.abort();
    this.#listening = null;
    this.#clearSource();
  }

  #selectSource(): void {
    this.#clearSource();
    const sourceId = this.#sourceId;
    if (document.visibilityState === "visible") {
      this.#startFrames(sourceId);
    } else {
      this.#unsubscribeTicks = this.#tickSource.subscribe(() => this.#step(performance.now()));
    }
  }

  #startFrames(sourceId: number): void {
    this.#frameId = requestAnimationFrame(nowMs => {
      this.#step(nowMs);
      if (sourceId === this.#sourceId) this.#startFrames(sourceId);
    });
  }

  #clearSource(): void {
    this.#sourceId += 1;
    cancelAnimationFrame(this.#frameId);
    this.#unsubscribeTicks?.();
    this.#unsubscribeTicks = null;
  }
}
```

The composition root passes the creating function, where the bundler sees the literal:

```ts
const timerWorker = new TimerWorkerAdapter({
  createWorker: () => new Worker(new URL("./timer.worker.ts", import.meta.url))
});
const frameLoop = new CadenceLoopAdapter({ tickSource: timerWorker, step: drawFrame });
```

- `step` gets the time and works out what is due from it: a frame callback and a tick can each come
  late, and ticks that waited behind a busy thread arrive in a burst. Frame and `performance.now()`
  times share one clock.
- Each source carries an id, so a frame callback that ran `dispose()` and `start()` inside `step`
  leaves exactly one frame loop behind.

## A compute worker

```ts
// peaks-worker.contract.ts
export type PeaksRequest = { samples: Float32Array<ArrayBuffer>; bucketCount: number };
export type PeaksReply = { peaks: Float32Array<ArrayBuffer> };
```

```ts
// peaks.worker.ts
import { measurePeaks } from "./measure-peaks";
import type { PeaksReply, PeaksRequest } from "./peaks-worker.contract";

self.addEventListener("message", (event: MessageEvent<PeaksRequest>) => {
  const reply: PeaksReply = { peaks: measurePeaks(event.data) };
  self.postMessage(reply, [reply.peaks.buffer]);
});
```

```ts
// peaks-worker.adapter.ts
import type { PeaksReply, PeaksRequest } from "./peaks-worker.contract";

export type PeaksOutcome =
  | { kind: "done"; peaks: Float32Array<ArrayBuffer> }
  | { kind: "cancelled" }
  | { kind: "failed"; reason: string };

type Deps = { createWorker: () => Worker };
type Options = { timeoutMs?: number };

const DEFAULT_TIMEOUT_MS = 10_000;

/** Measures waveform peaks on a worker, one request at a time; a newer request ends the older. */
export class PeaksWorkerAdapter {
  readonly #createWorker: () => Worker;
  readonly #timeoutMs: number;

  #worker: Worker | null = null;
  #settle: ((outcome: PeaksOutcome) => void) | null = null;

  constructor(deps: Deps, options?: Options) {
    this.#createWorker = deps.createWorker;
    this.#timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /** Takes ownership of `request.samples`, which owns its whole buffer: the buffer moves. */
  measurePeaks(request: PeaksRequest, signal: AbortSignal): Promise<PeaksOutcome> {
    this.#finish({ kind: "cancelled" });
    if (signal.aborted) return Promise.resolve({ kind: "cancelled" });
    return new Promise(resolve => {
      const cancel = (): void => this.#finish({ kind: "cancelled" });
      const deadline = setTimeout(
        () => this.#finish({ kind: "failed", reason: "timed out" }),
        this.#timeoutMs
      );
      signal.addEventListener("abort", cancel, { once: true });
      this.#settle = outcome => {
        clearTimeout(deadline);
        signal.removeEventListener("abort", cancel);
        this.#settle = null;
        resolve(outcome);
      };
      try {
        this.#worker ??= this.#startWorker();
        this.#worker.postMessage(request, [request.samples.buffer]);
      } catch (error) {
        this.#finish({
          kind: "failed",
          reason: error instanceof Error ? error.message : "send failed"
        });
      }
    });
  }

  dispose(): void {
    this.#finish({ kind: "cancelled" });
    this.#worker?.terminate();
    this.#worker = null;
  }

  /** Ends the running request, if any, with `outcome`, and drops the worker that runs it. */
  #finish(outcome: PeaksOutcome): void {
    if (!this.#settle) return;
    this.#worker?.terminate();
    this.#worker = null;
    this.#settle(outcome);
  }

  #startWorker(): Worker {
    const worker = this.#createWorker();
    worker.addEventListener("message", (event: MessageEvent<PeaksReply>) => {
      if (worker === this.#worker) this.#settle?.({ kind: "done", peaks: event.data.peaks });
    });
    worker.addEventListener("messageerror", () => {
      if (worker === this.#worker) this.#finish({ kind: "failed", reason: "unreadable reply" });
    });
    worker.addEventListener("error", (event: ErrorEvent) => {
      if (worker === this.#worker) {
        this.#finish({ kind: "failed", reason: event.message || "worker failed to run" });
      }
    });
    return worker;
  }
}
```

- `measurePeaks` in `measure-peaks.ts` is a plain function: the worker file only wires it to
  messages, and a suite calls it directly.
- Every path settles once through `#settle`: the reply, a cancel, the deadline, a failure to create
  the worker or send the request, an unreadable reply, and a crash. A worker that closes itself
  without replying ends at the deadline.
- Terminating is the cancel here, because one call computes the whole result. A computation that
  works in chunks yields a task between them, gets a `cancel` message, and keeps its worker.
- A queue of independent requests, where one cancel must not end the others, gives each request an
  id, keeps a map of pending ones, and cancels by message.
