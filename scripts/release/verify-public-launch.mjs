#!/usr/bin/env node

/**
 * 公開切替後のDB・Storage・商品画像を、公開カタログの正本と照合する。
 *
 * 件数だけでは誤った商品名や画像パスを見落とすため、レビュー可能な商品の全フィールドを比較する。
 * `--site-url`を指定した場合は、デプロイ済み画像が実際に画像として取得できることも確認する。
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { publicCatalog } from "./public-catalog.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const pageSize = 1000;

function readRequiredEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URLが設定されていません。");
  if (!secretKey || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey)) {
    throw new Error("SUPABASE_SECRET_KEYがsb_secret_形式で設定されていません。");
  }
  return { url, secretKey };
}

async function countRows(supabase, table, configure = (query) => query) {
  const query = configure(supabase.from(table).select("*", { count: "exact", head: true }));
  const { count, error } = await query;
  if (error) throw new Error(`${table}の件数取得に失敗しました: ${error.message}`);
  return count ?? 0;
}

async function listStorageObjects(supabase, bucket, prefix = "") {
  const objects = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" }
    });
    if (error) throw new Error(`${bucket}の一覧取得に失敗しました: ${error.message}`);

    for (const item of data) {
      const objectPath = [prefix, item.name].filter(Boolean).join("/");
      if (!item.id && !item.metadata) objects.push(...(await listStorageObjects(supabase, bucket, objectPath)));
      else objects.push(objectPath);
    }
    if (data.length < pageSize) return objects;
  }
}

function isWebP(header) {
  return header.length >= 12 && header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const { url, secretKey } = readRequiredEnvironment();
  const siteUrlArgument = process.argv.find((argument) => argument.startsWith("--site-url="))?.slice("--site-url=".length);
  const siteUrl = siteUrlArgument ? new URL(siteUrlArgument) : null;
  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
  const errors = [];

  const zeroCountChecks = [
    ["reviews", await countRows(supabase, "reviews")],
    ["review_likes", await countRows(supabase, "review_likes")],
    ["review_reports", await countRows(supabase, "review_reports")],
    ["notifications", await countRows(supabase, "notifications")],
    ["product_requests", await countRows(supabase, "product_requests")],
    ["product_favorites", await countRows(supabase, "product_favorites")],
    [
      "demo notification preferences",
      await countRows(supabase, "notification_preferences", (query) => query.like("user_id", "demo-reviewer-%"))
    ],
    [
      "demo contact inquiries",
      await countRows(supabase, "contact_inquiries", (query) => query.like("user_id", "demo-reviewer-%"))
    ],
    ["demo profiles", await countRows(supabase, "profiles", (query) => query.like("user_id", "demo-reviewer-%"))]
  ];
  for (const [label, count] of zeroCountChecks) {
    if (count !== 0) errors.push(`${label}が0件ではありません（${count}件）。`);
  }

  const { data: reviewableProducts, error: productsError } = await supabase
    .from("products")
    .select("id,name,maker,category_id,image_url,is_reviewable")
    .eq("is_reviewable", true)
    .order("id", { ascending: true });
  if (productsError) throw new Error(`productsの取得に失敗しました: ${productsError.message}`);

  const actualProducts = new Map(reviewableProducts.map((product) => [product.id, product]));
  if (actualProducts.size !== publicCatalog.length) {
    errors.push(`レビュー可能な商品が${publicCatalog.length}件ではありません（${actualProducts.size}件）。`);
  }

  const [allProductCount, hiddenProductCount] = await Promise.all([
    countRows(supabase, "products"),
    countRows(supabase, "products", (query) => query.eq("is_reviewable", false))
  ]);
  if (allProductCount !== 30 || hiddenProductCount !== 20) {
    errors.push(`商品マスタが公開10件・非公開20件ではありません（全${allProductCount}件・非公開${hiddenProductCount}件）。`);
  }

  for (const expected of publicCatalog) {
    const actual = actualProducts.get(expected.id);
    if (!actual) {
      errors.push(`${expected.name}（${expected.id}）がDBにありません。`);
      continue;
    }
    const differences = [
      ["name", actual.name, expected.name],
      ["maker", actual.maker, expected.maker],
      ["category_id", actual.category_id, expected.categoryId],
      ["image_url", actual.image_url, expected.imageUrl]
    ].filter(([, actualValue, expectedValue]) => actualValue !== expectedValue);
    for (const [field, actualValue, expectedValue] of differences) {
      errors.push(`${expected.id}の${field}が不一致です（実際: ${actualValue} / 期待: ${expectedValue}）。`);
    }

    const localImagePath = path.join(projectRoot, "public", expected.imageUrl.replace(/^\//, ""));
    let localImageBytes = null;
    try {
      localImageBytes = await readFile(localImagePath);
      if (localImageBytes.length === 0 || !isWebP(localImageBytes.subarray(0, 12))) {
        errors.push(`${expected.imageUrl}が有効なWebP画像ではありません。`);
      }
    } catch {
      errors.push(`${expected.imageUrl}がローカルにありません。`);
    }

    if (siteUrl && localImageBytes) {
      const imageUrl = new URL(expected.imageUrl, siteUrl);
      const response = await fetch(imageUrl, { redirect: "error" }).catch(() => null);
      if (!response?.ok || !response.headers.get("content-type")?.startsWith("image/")) {
        errors.push(`${imageUrl.toString()}から公開画像を取得できません。`);
      } else {
        // HTTP 200だけでは古い画像や別商品の取り違えを検出できないため、デプロイ済みの実体まで照合する。
        const remoteImageBytes = Buffer.from(await response.arrayBuffer());
        if (sha256(remoteImageBytes) !== sha256(localImageBytes)) {
          errors.push(`${imageUrl.toString()}の内容がローカル画像と一致しません。`);
        }
      }
    }
  }

  for (const actualId of actualProducts.keys()) {
    if (!publicCatalog.some((product) => product.id === actualId)) {
      errors.push(`想定外の商品${actualId}がレビュー可能です。`);
    }
  }

  const reviewImageObjects = await listStorageObjects(supabase, "review-images");
  if (reviewImageObjects.length !== 0) {
    errors.push(`review-imagesに${reviewImageObjects.length}件のファイルが残っています。`);
  }

  if (errors.length > 0) {
    console.error("公開切替の検証に失敗しました。\n");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("公開切替の検証に成功しました。商品10件、仮レビュー0件、仮データ0件です。");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "公開切替の検証中に不明なエラーが発生しました。");
  process.exitCode = 1;
});
