import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtSize, isPreviewable, MAX_FILES, pickAllowed, uniqueName } from "./files.ts";

const file = (name: string, size: number) => ({ name, size }) as File;

test("fmtSize", () => {
  assert.equal(fmtSize(512), "512 B");
  assert.equal(fmtSize(2048), "2 KB");
  assert.equal(fmtSize(1.5 * 1024 * 1024), "1,5 MB");
});

test("isPreviewable: yalnızca raster görseller", () => {
  assert.equal(isPreviewable({ type: "image/png" }), true);
  assert.equal(isPreviewable({ type: "image/svg+xml" }), false);
  assert.equal(isPreviewable({ type: "application/pdf" }), false);
});

test("uniqueName: yinelenen adlara sayı ekler", () => {
  assert.equal(uniqueName("image.png", []), "image.png");
  assert.equal(uniqueName("image.png", ["image.png"]), "image (2).png");
  assert.equal(uniqueName("image.png", ["image.png", "image (2).png"]), "image (3).png");
  assert.equal(uniqueName("notlar", ["notlar"]), "notlar (2)");
});

test("pickAllowed: boş, büyük ve fazla dosyayı reddeder", () => {
  const r = pickAllowed([file("a", 10), file("b", 0), file("c", 200)], 0, 100);
  assert.deepEqual(r.ok.map((f) => f.name), ["a"]);
  assert.equal(r.errors.length, 2);
  const full = pickAllowed([file("x", 1)], MAX_FILES);
  assert.equal(full.ok.length, 0);
  assert.equal(full.errors.length, 1);
});
