import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { PATHS } from "#paths/index.ts";

function createFixture(): string {
  const tempPath = realpathSync(mkdtempSync(path.join(tmpdir(), "paths-service-")));
  const chunkDirPath = path.join(tempPath, "skills/demo/scripts/dist/chunks");

  mkdirSync(chunkDirPath, { recursive: true });

  writeFileSync(path.join(tempPath, "skills/demo/SKILL.md"), "");
  writeFileSync(path.join(tempPath, "skills/demo/scripts/package.json"), "{}\n");
  writeFileSync(path.join(chunkDirPath, "chunk.mjs"), "");

  return tempPath;
}

test("the root is the nearest folder holding the marker, package.json by default", () => {
  const tempPath = createFixture();

  const moduleUrl = pathToFileURL(
    path.join(tempPath, "skills/demo/scripts/dist/chunks/chunk.mjs")
  ).href;

  const packagePathsService = new PATHS.PathsService({ moduleUrl, relativePathsMap: {} });

  const skillPathsService = new PATHS.PathsService({
    moduleUrl,
    relativePathsMap: { templates: "assets/templates" },
    rootMarkerName: "SKILL.md"
  });

  assert.equal(packagePathsService.rootPath, path.join(tempPath, "skills/demo/scripts"));
  assert.equal(skillPathsService.rootPath, path.join(tempPath, "skills/demo"));
  assert.equal(
    skillPathsService.getPath("templates"),
    path.join(tempPath, "skills/demo/assets/templates")
  );
});

test("a module with no marker above it names the marker and the module", () => {
  const tempPath = createFixture();
  const moduleUrl = pathToFileURL(path.join(tempPath, "skills/demo/SKILL.md")).href;

  const pathsService = new PATHS.PathsService({
    moduleUrl,
    relativePathsMap: {},
    rootMarkerName: "no-such-marker.yaml"
  });

  assert.throws(
    () => pathsService.rootPath,
    /^PathsRootMissingError: no no-such-marker\.yaml above /
  );
});
