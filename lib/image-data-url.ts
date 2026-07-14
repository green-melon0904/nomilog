/**
 * 画像のData URLを、Storageへ保存してよい検証済みバイナリへ変換する。
 *
 * Content-Typeや拡張子はリクエスト側で偽装できるため、Data URLの宣言・容量・実ファイルの
 * 先頭署名をまとめて確認する。レビュー画像とプロフィール画像が別々のRoute Handlerで同じ
 * 公開Storage境界を通るため、検証規則を共有して片方だけ弱くなる変更を防ぐ。
 */
import type { ProfileImageMimeType } from "@/lib/profile";

const dataUrlPattern = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;
const largestDataUrlHeaderLength = "data:image/jpeg;base64,".length;

export type ValidImageData = {
  type: ProfileImageMimeType;
  bytes: Buffer;
};

/**
 * Data URLを許可された画像バイナリへ変換する。
 *
 * @param maxBytes 保存先のバケット制約と同じ最大バイト数
 * @returns MIME・容量・署名が一致したときだけStorage用の値を返す
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
  if (bytes.length === 0 || bytes.length > maxBytes || !hasExpectedImageSignature(bytes, type)) return null;

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
 * 防げる。画像デコードまでは行わず、バケット側のMIME・容量制限も二重の境界として残す。
 */
function hasExpectedImageSignature(bytes: Buffer, type: ProfileImageMimeType) {
  if (type === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
}
