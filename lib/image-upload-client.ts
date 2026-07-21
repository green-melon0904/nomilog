/**
 * ブラウザで選ばれた画像を、公開Storageへ送れるサイズへ整えるクライアント専用処理。
 *
 * サーバー側でもMIME・バイト数・寸法を再検証するため、ここはセキュリティ境界ではない。iPhoneの
 * 24MP/48MP写真を選んでも利用者に手動リサイズを強いず、サーバーが巨大画像を拒否する前に
 * 端末内で縮小するための操作性の層として置く。
 */
import { maxUploadImageDimension, maxUploadImagePixels } from "@/lib/image-limits";
import { profileImageMimeTypes, type ProfileImageMimeType } from "@/lib/profile";

// RAW形式は許可しないため、iPhoneの高解像度JPEGを選べる範囲に留めて端末のデコード負荷も抑える。
// 保存時は必ず2MB以下へ縮小するので、ここは公開Storageの容量上限ではなく選択元の操作上限になる。
export const maxSelectableImageBytes = 50 * 1024 * 1024;

/**
 * MIMEタイプが画像選択・保存の両方で許可された形式か確認する。
 * inputのaccept属性はブラウザ上の候補表示しか制限しないため、選択後にも明示的に確認する。
 */
export function isSupportedImageMimeType(value: string): value is ProfileImageMimeType {
  return profileImageMimeTypes.includes(value as ProfileImageMimeType);
}

/**
 * 画像を公開用Data URLへ変換する。
 *
 * すでにサーバーの寸法・容量上限に収まる画像は再圧縮せず、元の画質や透過情報を保つ。上限を超える
 * 画像だけCanvasで段階的に縮小・圧縮するため、すべての画像を一律変換して画質を落とす方式は採らない。
 *
 * @param file ユーザーが選んだJPEG、PNG、WebPファイル
 * @param maxBytes APIとStorageが受け付ける最終バイト数
 * @returns サーバーの画像検証へ渡せるData URL
 */
export async function prepareImageDataUrl(file: File, maxBytes: number): Promise<string> {
  const image = await loadImage(file);
  const initialSize = fitImageDimensions(image.naturalWidth, image.naturalHeight);
  const isAlreadySafe =
    initialSize.width === image.naturalWidth &&
    initialSize.height === image.naturalHeight &&
    file.size <= maxBytes;

  if (isAlreadySafe) return readBlobAsDataUrl(file);

  const preferredType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  let { width, height } = initialSize;

  // 画質だけでは2MBに収まらない細部の多い写真もあるため、品質を下げた後に寸法も段階的に縮める。
  // サーバー側の上限を緩めて解決すると、巨大な圧縮画像を公開できる問題が戻るため採用しない。
  for (let resizeAttempt = 0; resizeAttempt < 5; resizeAttempt += 1) {
    const canvas = drawImageToCanvas(image, width, height);
    for (const quality of [0.88, 0.78, 0.68, 0.58]) {
      const blob = await encodeCanvas(canvas, preferredType, quality);
      if (blob.size <= maxBytes) return readBlobAsDataUrl(blob);
    }

    if (width === 1 && height === 1) break;
    width = Math.max(1, Math.floor(width * 0.8));
    height = Math.max(1, Math.floor(height * 0.8));
  }

  throw new Error("画像を投稿用に調整できませんでした。別の画像を選んでください。");
}

function fitImageDimensions(width: number, height: number) {
  if (!width || !height) throw new Error("画像の大きさを読み取れませんでした。別の画像を選んでください。");

  const longestSideScale = maxUploadImageDimension / Math.max(width, height);
  const pixelScale = Math.sqrt(maxUploadImagePixels / (width * height));
  const scale = Math.min(1, longestSideScale, pixelScale);

  return {
    width: Math.max(1, Math.floor(width * scale)),
    height: Math.max(1, Math.floor(height * scale))
  };
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    const releaseObjectUrl = () => URL.revokeObjectURL(objectUrl);

    image.onload = () => {
      releaseObjectUrl();
      resolve(image);
    };
    image.onerror = () => {
      releaseObjectUrl();
      reject(new Error("画像を読み込めませんでした。別の画像を選んでください。"));
    };
    image.src = objectUrl;
  });
}

function drawImageToCanvas(image: HTMLImageElement, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("画像を投稿用に調整できませんでした。別の画像を選んでください。");

  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

async function encodeCanvas(canvas: HTMLCanvasElement, preferredType: "image/jpeg" | "image/webp", quality: number) {
  const preferredBlob = await canvasToBlob(canvas, preferredType, quality);
  if (preferredBlob.type === preferredType) return preferredBlob;
  if (preferredType === "image/jpeg") return preferredBlob;

  // WebPを出力できない古いブラウザでは白背景のJPEGへフォールバックする。透明PNGをそのまま
  // 送ると容量制限を満たせないことがあるため、互換性のために透過を優先するより投稿可能性を優先する。
  const fallbackCanvas = document.createElement("canvas");
  fallbackCanvas.width = canvas.width;
  fallbackCanvas.height = canvas.height;
  const fallbackContext = fallbackCanvas.getContext("2d");
  if (!fallbackContext) throw new Error("画像を投稿用に調整できませんでした。別の画像を選んでください。");
  fallbackContext.fillStyle = "#ffffff";
  fallbackContext.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
  fallbackContext.drawImage(canvas, 0, 0);
  return canvasToBlob(fallbackCanvas, "image/jpeg", quality);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/webp", quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("画像を投稿用に調整できませんでした。別の画像を選んでください。"));
    }, type, quality);
  });
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("画像を読み込めませんでした。別の画像を選んでください。"));
    reader.onerror = () => reject(new Error("画像を読み込めませんでした。別の画像を選んでください。"));
    reader.readAsDataURL(blob);
  });
}
