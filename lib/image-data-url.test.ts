import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { readImageDataUrl } from "./image-data-url.ts";

function toDataUrl(bytes: Buffer, type: "image/jpeg" | "image/png" | "image/webp") {
  return `data:${type};base64,${bytes.toString("base64")}`;
}

function createPngHeader(width: number, height: number) {
  const bytes = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function createJpegHeader(width: number, height: number) {
  const bytes = Buffer.alloc(21);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  bytes[3] = 0xc0;
  bytes.writeUInt16BE(17, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
}

function createWebpHeader(width: number, height: number) {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUInt32LE(10, 16);
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
}

test("accepts real PNG and JPEG fixtures that browsers commonly produce", () => {
  // 形式ごとの実ファイルを通すことで、固定オフセットだけに依存する変更が通常画像を壊さないと確認する。
  const png = readFileSync(join(process.cwd(), "test/fixtures/image-64.png"));
  const jpeg = readFileSync(join(process.cwd(), "test/fixtures/image-64.jpg"));

  assert.notEqual(readImageDataUrl(toDataUrl(png, "image/png"), 2 * 1024 * 1024), null);
  assert.notEqual(readImageDataUrl(toDataUrl(jpeg, "image/jpeg"), 2 * 1024 * 1024), null);
});

test("accepts a valid small PNG that normal clients can upload", () => {
  // 回帰テスト用に実ファイルのPNGを使い、ヘッダー解析の追加で通常の画像まで拒否しないことを確かめる。
  const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlqD8sAAAAASUVORK5CYII=";

  assert.notEqual(readImageDataUrl(dataUrl, 2 * 1024 * 1024), null);
});

test("accepts an ordinary 12MP PNG within the public image budget", () => {
  const dataUrl = toDataUrl(createPngHeader(4032, 3024), "image/png");

  assert.notEqual(readImageDataUrl(dataUrl, 2 * 1024 * 1024), null);
});

test("rejects an oversized PNG before any upload can use its bytes", () => {
  const dataUrl = toDataUrl(createPngHeader(10_000, 10_000), "image/png");

  assert.equal(readImageDataUrl(dataUrl, 2 * 1024 * 1024), null);
});

test("enforces the same dimension budget for JPEG and WebP", () => {
  assert.notEqual(readImageDataUrl(toDataUrl(createJpegHeader(4032, 3024), "image/jpeg"), 2 * 1024 * 1024), null);
  assert.equal(readImageDataUrl(toDataUrl(createJpegHeader(10_000, 10_000), "image/jpeg"), 2 * 1024 * 1024), null);
  assert.notEqual(readImageDataUrl(toDataUrl(createWebpHeader(4032, 3024), "image/webp"), 2 * 1024 * 1024), null);
  assert.equal(readImageDataUrl(toDataUrl(createWebpHeader(10_000, 10_000), "image/webp"), 2 * 1024 * 1024), null);
});
