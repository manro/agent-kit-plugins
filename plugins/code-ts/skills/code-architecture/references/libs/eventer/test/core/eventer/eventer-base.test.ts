import assert from "node:assert/strict";
import { test } from "node:test";

import { EVENTER } from "#eventer/index.ts";

type DownloadListeners = {
  progress: (doneBytes: number, fileName: string) => void;
  finish: () => void;
};

class Download extends EVENTER.EventerBase<DownloadListeners> {
  run(): void {
    this.emit("progress", 5, "a.zip");
    this.emit("progress", 10, "a.zip");
    this.emit("finish");
  }
}

test("listeners get each event's arguments in order; a once listener only the first", () => {
  const download = new Download();
  const progressList: [number, string][] = [];
  const onceList: number[] = [];
  let finishCount = 0;

  download.addEventListener("progress", (doneBytes, fileName) =>
    progressList.push([doneBytes, fileName])
  );

  download.addOnceEventListener("progress", doneBytes => onceList.push(doneBytes));
  download.addEventListener("finish", () => finishCount++);
  download.run();

  assert.deepEqual(progressList, [
    [5, "a.zip"],
    [10, "a.zip"]
  ]);

  assert.deepEqual(onceList, [5]);
  assert.equal(finishCount, 1);
});

test("a removed listener hears nothing more; removeAllEventListeners clears every event", () => {
  const download = new Download();
  const heardList: string[] = [];
  const recordProgress = (): number => heardList.push("progress");

  download.addEventListener("progress", recordProgress);
  download.addEventListener("finish", () => heardList.push("finish"));
  download.removeEventListener("progress", recordProgress);
  download.run();
  download.removeAllEventListeners();
  download.run();

  assert.deepEqual(heardList, ["finish"]);
});

test("a listeners map cannot name an event node:events reserves", () => {
  // Never called: tsc fails on a line below once the map type accepts its reserved name.
  const buildReservedDownloadsList = (): unknown[] => [
    // @ts-expect-error node:events throws on an `error` event nobody listens to
    new (class extends EVENTER.EventerBase<{ error: () => void }> {})(),
    // @ts-expect-error node:events emits `newListener` itself, with its own arguments
    new (class extends EVENTER.EventerBase<{ newListener: (doneCount: number) => void }> {})(),
    // @ts-expect-error node:events emits `removeListener` itself, with its own arguments
    new (class extends EVENTER.EventerBase<{ removeListener: () => void }> {})()
  ];

  assert.equal(typeof buildReservedDownloadsList, "function");
});
