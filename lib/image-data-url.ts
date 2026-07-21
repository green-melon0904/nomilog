/**
 * 画像のData URLを、Storageへ保存してよい検証済みバイナリへ変換する。
 *
 * Content-Typeや拡張子はリクエスト側で偽装できるため、Data URLの宣言・容量・実ファイルの
 * 先頭署名をまとめて確認する。レビュー画像とプロフィール画像が別々のRoute Handlerで同じ
 * 公開Storage境界を通るため、検証規則を共有して片方だけ弱くなる変更を防ぐ。
 */
import { maxUploadImageDimension, maxUploadImagePixels } from "./image-limits.ts";
import type { ProfileImageMimeType } from "./profile.ts";

const dataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const largestDataUrlHeaderLength = "data:image/jpeg;base64,".length;
// 4032 x 3024の一般的な12MP写真は受け入れつつ、公開レビューを表示するiPhone Safariで
// 数百MB単位の画像展開が起きないように、共有定数で辺の長さと総ピクセル数を別々に制限する。

export type ValidImageData = {
  type: ProfileImageMimeType;
  bytes: Buffer;
};

/**
 * Data URLを許可された画像バイナリへ変換する。
 *
 * @param maxBytes 保存先のバケット制約と同じ最大バイト数
 * @returns MIME・容量・署名・画像寸法が一致したときだけStorage用の値を返す
 */
export function readImageDataUrl(value: string, maxBytes: number): ValidImageData | null {
  // Base64は3バイトごとに4文字へ膨らむ。先に文字列長を絞ることで、容量超過の入力を
  // Bufferへデコードせずに落とし、画像保存前のメモリ消費を必要最小限にする。
  const maxBase64Length = Math.ceil(maxBytes / 3) * 4;
  if (value.length > largestDataUrlHeaderLength + maxBase64Length) return null;

  const match = dataUrlPattern.exec(value);
  if (!match) return null;

  const type = match[1] as ProfileImageMimeType;
  const bytes = Buffer.from(match[2], "base64");
  if (
    bytes.length === 0 ||
    bytes.length > maxBytes ||
    !hasExpectedImageSignature(bytes, type) ||
    !hasSafeImageDimensions(bytes, type)
  ) {
    return null;
  }

  return { type, bytes };
}

/**
 * Storageパスの拡張子を、検証済みのMIMEタイプから決める。
 * ブラウザが渡した元ファイル名は利用せず、拡張子と中身が食い違う公開ファイルを作らない。
 */
export function imageExtension(type: ProfileImageMimeType) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

/**
 * 宣言されたMIMEと実データの先頭署名が一致するか確認する。
 * JPEG/PNG/WebPは先頭バイトの形式が安定しているため、軽量な検査でも単なるContent-Type偽装を
 * 防げる。画像デコードまでは行わず、後段の寸法検査とバケット側のMIME・容量制限を二重の境界として残す。
 */
function hasExpectedImageSignature(bytes: Buffer, type: ProfileImageMimeType) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}

/**
 * 圧縮後のバイト数ではなく、描画時に必要になる画像の大きさを上限内に収める。
 *
 * Data URLをそのまま公開Storageへ保存すると、数KBまで圧縮された巨大画像でも閲覧者のブラウザが
 * 大きな展開領域を確保する。ここでは各形式のヘッダーだけを読み、壊れた形式・上限超過の画像を
 * デコードやStorage書き込みより前に拒否する。完全な再エンコードは画質・処理時間の方針を伴うため、
 * 現時点では入力形式を保ったまま安全な寸法境界だけを共有する。
 */
function hasSafeImageDimensions(bytes: Buffer, type: ProfileImageMimeType) {
  const dimensions = readImageDimensions(bytes, type);
  if (!dimensions) return false;

  const { width, height } = dimensions;
  return (
    width > 0 &&
    height > 0 &&
    width <= maxUploadImageDimension &&
    height <= maxUploadImageDimension &&
    width * height <= maxUploadImagePixels
  );
}

type ImageDimensions = {
  width: number;
  height: number;
};

/**
 * JPEG/PNG/WebPのメタデータから、デコード前に幅と高さを読み取る。
 *
 * 形式ごとにヘッダー位置が異なるため、MIMEだけを信頼して共通の固定オフセットを読むことはしない。
 * 寸法を確定できない破損画像は安全側で拒否し、ブラウザやStorageを検証器として使わない。
 */
function readImageDimensions(bytes: Buffer, type: ProfileImageMimeType): ImageDimensions | null {
  if (type === "image/png") return readPngDimensions(bytes);
  if (type === "image/jpeg") return readJpegDimensions(bytes);
  return readWebpDimensions(bytes);
}

function readPngDimensions(bytes: Buffer): ImageDimensions | null {
  // PNGは署名直後の最初のIHDRチャンクだけがキャンバス寸法を定義する。
  if (
    bytes.length < 24 ||
    bytes.readUInt32BE(8) !== 13 ||
    bytes.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    return null;
  }

  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20)
  };
}

function readJpegDimensions(bytes: Buffer): ImageDimensions | null {
  let offset = 2;

  // JPEGはAPPメタデータの後ろにSOFが現れるため、セグメント長を確認しながらSOFまで進む。
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    while (bytes[offset] === 0xff) offset += 1;

    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const segmentLength = bytes.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > bytes.length) return null;

    if (isJpegStartOfFrame(marker)) {
      if (segmentLength < 8) return null;
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5)
      };
    }

    offset += segmentLength;
  }

  return null;
}

function isJpegStartOfFrame(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function readWebpDimensions(bytes: Buffer): ImageDimensions | null {
  let offset = 12;

  // WebPはRIFFチャンクの並びでエンコード方式が分かれるため、各チャンクの長さとパディングを守って読む。
  while (offset + 8 <= bytes.length) {
    const chunkType = bytes.subarray(offset, offset + 4).toString("ascii");
    const chunkLength = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    if (dataOffset + chunkLength > bytes.length) return null;

    if (chunkType === "VP8X" && chunkLength >= 10) {
      return {
        width: 1 + bytes.readUIntLE(dataOffset + 4, 3),
        height: 1 + bytes.readUIntLE(dataOffset + 7, 3)
      };
    }

    if (
      chunkType === "VP8 " &&
      chunkLength >= 10 &&
      bytes[dataOffset + 3] === 0x9d &&
      bytes[dataOffset + 4] === 0x01 &&
      bytes[dataOffset + 5] === 0x2a
    ) {
      return {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff
      };
    }

    if (chunkType === "VP8L" && chunkLength >= 5 && bytes[dataOffset] === 0x2f) {
      const b0 = bytes[dataOffset + 1];
      const b1 = bytes[dataOffset + 2];
      const b2 = bytes[dataOffset + 3];
      const b3 = bytes[dataOffset + 4];
      if (b0 === undefined || b1 === undefined || b2 === undefined || b3 === undefined) return null;

      return {
        width: 1 + b0 + ((b1 & 0x3f) << 8),
        height: 1 + (b1 >> 6) + (b2 << 2) + ((b3 & 0x0f) << 10)
      };
    }

    offset = dataOffset + chunkLength + (chunkLength % 2);
  }

  return null;
}
