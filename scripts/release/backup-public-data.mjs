#!/usr/bin/env node

/**
 * 公開切替前のアプリデータと、レビュー・プロフィール画像をローカルへ退避する。
 *
 * Secret keyはRLSを迂回できるため、バックアップ内容を画面や標準出力へ出さず、Git管理外の
 * ディレクトリへ所有者だけが読める権限で保存する。これはSupabase全体の災害復旧用dumpではなく、
 * 公開切替を取り消すための対象データスナップショットである。
 */
import { createHash } from "node:crypto";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");
const pageSize = 1000;
const storageBuckets = ["review-images", "profile-images"];
const tableExports = [
  { name: "categories", orderBy: ["id"] },
  { name: "products", orderBy: ["id"] },
  { name: "app_admins", orderBy: ["user_id"] },
  { name: "profiles", orderBy: ["user_id"] },
  { name: "reviews", orderBy: ["id"] },
  { name: "review_likes", orderBy: ["review_id", "user_id"] },
  { name: "review_reports", orderBy: ["id"] },
  { name: "notifications", orderBy: ["id"] },
  { name: "notification_preferences", orderBy: ["user_id"] },
  { name: "contact_inquiries", orderBy: ["id"] },
  { name: "product_requests", orderBy: ["id"] },
  { name: "product_favorites", orderBy: ["product_id", "user_id"] }
];

function readRequiredEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URLが設定されていません。");
  if (!secretKey || !/^sb_secret_[A-Za-z0-9_-]+$/.test(secretKey)) {
    throw new Error("SUPABASE_SECRET_KEYがsb_secret_形式で設定されていません。");
  }

  return { url, secretKey };
}

function resolveOutputDirectory() {
  const requested = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const outputDirectory = requested
    ? path.resolve(requested)
    : path.resolve(projectRoot, "..", "nomilog-release-backups", timestamp);
  const relativeToProject = path.relative(projectRoot, outputDirectory);

  // 個人情報を含むJSONをGitへ誤追加しないことを、注意書きだけでなく保存先の制約でも守る。
  if (relativeToProject === "" || (!relativeToProject.startsWith(`..${path.sep}`) && relativeToProject !== "..")) {
    throw new Error("バックアップ先にはプロジェクト外のディレクトリを指定してください。");
  }

  return outputDirectory;
}

async function writePrivateFile(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(filePath), 0o700);
  await writeFile(filePath, content, { mode: 0o600 });
  await chmod(filePath, 0o600);
}

async function fetchAllRows(supabase, table) {
  const rows = [];

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from(table.name).select("*").range(offset, offset + pageSize - 1);
    for (const column of table.orderBy) query = query.order(column, { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(`${table.name}の取得に失敗しました: ${error.message}`);
    rows.push(...data);
    if (data.length < pageSize) return rows;
  }
}

function appendObjectPath(prefix, name) {
  const segments = [...prefix.split("/"), ...name.split("/")].filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === ".." || segment.includes("\\") || segment.includes("\0"))) {
    throw new Error("Storageに安全でないオブジェクト名が含まれています。");
  }
  return segments.join("/");
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
      const objectPath = appendObjectPath(prefix, item.name);
      // Supabase Storageのlistはフォルダをidなしで返す。ファイルと同様にdownloadしようとすると
      // 空ファイルとして誤保存するため、フォルダだけを再帰的に展開する。
      if (!item.id && !item.metadata) objects.push(...(await listStorageObjects(supabase, bucket, objectPath)));
      else objects.push(objectPath);
    }

    if (data.length < pageSize) return objects;
  }
}

async function main() {
  const { url, secretKey } = readRequiredEnvironment();
  const outputDirectory = resolveOutputDirectory();
  const supabase = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });

  // 日付ディレクトリだけは既存だと失敗させ、同じバックアップへ上書きしない。
  // 親ディレクトリは初回実行では存在しないため、先に所有者限定で作成する。
  await mkdir(path.dirname(outputDirectory), { recursive: true, mode: 0o700 });
  await chmod(path.dirname(outputDirectory), 0o700);
  await mkdir(outputDirectory, { recursive: false, mode: 0o700 });
  await chmod(outputDirectory, 0o700);
  const incompleteMarker = path.join(outputDirectory, "BACKUP_INCOMPLETE");
  await writePrivateFile(incompleteMarker, "バックアップ処理が完了していません。\n");

  const manifest = {
    formatVersion: 2,
    createdAt: new Date().toISOString(),
    projectHost: new URL(url).host,
    tables: {},
    storage: {}
  };

  for (const table of tableExports) {
    const rows = await fetchAllRows(supabase, table);
    const fileName = `tables/${table.name}.json`;
    await writePrivateFile(path.join(outputDirectory, fileName), `${JSON.stringify(rows, null, 2)}\n`);
    manifest.tables[table.name] = { count: rows.length, file: fileName };
  }

  for (const bucket of storageBuckets) {
    const bucketManifest = { count: 0, objects: [] };
    const storageObjects = await listStorageObjects(supabase, bucket);
    for (const objectPath of storageObjects) {
      const { data, error } = await supabase.storage.from(bucket).download(objectPath);
      if (error) throw new Error(`${bucket}/${objectPath}の取得に失敗しました: ${error.message}`);

      const bytes = Buffer.from(await data.arrayBuffer());
      const relativePath = path.join("storage", bucket, ...objectPath.split("/"));
      await writePrivateFile(path.join(outputDirectory, relativePath), bytes);
      bucketManifest.objects.push({
        path: objectPath,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex")
      });
    }
    bucketManifest.count = bucketManifest.objects.length;
    manifest.storage[bucket] = bucketManifest;
  }

  await writePrivateFile(path.join(outputDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await rm(incompleteMarker);

  const storageCount = Object.values(manifest.storage).reduce((sum, bucket) => sum + bucket.count, 0);
  console.log(`公開切替バックアップを作成しました: ${outputDirectory}`);
  console.log(`テーブル: ${Object.keys(manifest.tables).length} / Storage: ${storageCount}件`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "バックアップ中に不明なエラーが発生しました。");
  process.exitCode = 1;
});
