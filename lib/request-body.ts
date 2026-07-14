/**
 * 画像付きJSONリクエストを、Route Handlerへ渡す前に容量上限付きで読み込む。
 *
 * Request.json()へ直接渡すと、Content-Lengthを偽装・省略した大きな本文も先にメモリへ展開される。
 * レビューとプロフィールはData URLを受け付けるため、ストリーム中にも上限を適用して、画像の
 * 保存前検証だけでは防げないメモリ消費を抑える。
 */

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the allowed size");
  }
}

/**
 * JSON本文を指定バイト数まで読み込み、構文エラー時はnullを返す。
 *
 * Content-Lengthがある場合は読み込み前に拒否し、ない場合もチャンクを加算して上限を越えた時点で
 * 読み込みを止める。通常のフォーム程度の小さなJSONには複雑なストリーム処理を広げず、画像を含む
 * Route Handlerだけで共通利用する。
 */
export async function readJsonBodyWithinLimit(request: Request, maxBytes: number): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > maxBytes) {
    throw new RequestBodyTooLargeError();
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
