/**
 * 公開カタログの正本、SQL、撮影一覧に転記ずれがないことを確認する。
 *
 * SQLはSupabase SQL Editorだけで実行できるよう値を内包しているため、正本ファイルからの参照に
 * 置き換えられない。このテストで重複を許容しつつ、公開前に不一致を確実に検出する。
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { publicCatalog } from "./public-catalog.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../..");

test("公開カタログのID・名称・画像パスは重複しない", () => {
  assert.equal(publicCatalog.length, 10);
  assert.equal(new Set(publicCatalog.map((product) => product.id)).size, 10);
  assert.equal(new Set(publicCatalog.map((product) => product.name)).size, 10);
  assert.equal(new Set(publicCatalog.map((product) => product.imageUrl)).size, 10);

  for (const product of publicCatalog) {
    assert.match(product.id, /^b0000000-0000-4000-8000-0000000000(?:0[1-9]|10)$/);
    assert.match(product.imageUrl, /^\/products\/real\/[a-z0-9-]+\.webp$/);
  }
});

test("公開切替SQLは正本と同じ10商品を登録する", async () => {
  const sql = await readFile(path.join(projectRoot, "supabase/release/public-launch.sql.template"), "utf8");
  assert.match(sql, /REPLACE_WITH_CONFIRMATION/);
  assert.match(sql, /PUBLIC_LAUNCH_2026_BACKUP_CONFIRMED/);
  assert.match(sql, /select count\(\*\) from public\.products\) <> 20/);
  assert.doesNotMatch(sql, /delete from public\.reviews\s*;/);
  assert.doesNotMatch(sql, /delete from public\.product_favorites\s*;/);
  assert.doesNotMatch(sql, /delete from public\.product_requests\s*;/);

  for (const product of publicCatalog) {
    const expectedTuple =
      `('${product.id}', '${product.name}', '${product.maker}', '${product.categoryId}', ` +
      `'${product.imageUrl}', 0, 0, 0, 0, 0, true)`;
    assert.ok(sql.includes(expectedTuple), `${product.name}のID・メーカー・カテゴリ・画像の組み合わせがSQLと一致しません。`);
  }
});

test("外部バックアップはプロフィール削除で連鎖する付随データも保存する", async () => {
  const script = await readFile(path.join(projectRoot, "scripts/release/backup-public-data.mjs"), "utf8");

  for (const table of ["app_admins", "notification_preferences", "contact_inquiries"]) {
    assert.ok(script.includes(`{ name: "${table}"`), `${table}が外部バックアップ対象にありません。`);
  }

  for (const bucket of ["review-images", "profile-images"]) {
    assert.ok(script.includes(`"${bucket}"`), `${bucket}がStorageバックアップ対象にありません。`);
  }
});

test("撮影一覧は正本と同じ商品名と画像ファイル名を案内する", async () => {
  const document = await readFile(path.join(projectRoot, "docs/public-product-catalog.md"), "utf8");
  const rows = document.split("\n");

  for (const product of publicCatalog) {
    const row = rows.find((line) => line.includes(`| ${product.name} |`));
    assert.ok(row, `${product.name}が撮影一覧にありません。`);
    assert.ok(row.includes(`| ${product.maker} |`), `${product.name}のメーカーが同じ行にありません。`);
    assert.ok(
      row.includes(`\`${path.basename(product.imageUrl, ".webp")}\``),
      `${product.name}の画像ファイル名が同じ行にありません。`
    );
  }
});

test("書き込み停止と再開のSQLは公開切替の権限境界を対にする", async () => {
  const [pauseSql, resumeSql, launchSql] = await Promise.all([
    readFile(path.join(projectRoot, "supabase/release/public-launch-pause-writes.sql.template"), "utf8"),
    readFile(path.join(projectRoot, "supabase/release/public-launch-resume-writes.sql.template"), "utf8"),
    readFile(path.join(projectRoot, "supabase/release/public-launch.sql.template"), "utf8")
  ]);

  assert.match(pauseSql, /REPLACE_WITH_CONFIRMATION/);
  assert.match(pauseSql, /PUBLIC_LAUNCH_2026_WRITE_PAUSE_CONFIRMED/);
  assert.match(resumeSql, /REPLACE_WITH_CONFIRMATION/);
  assert.match(resumeSql, /PUBLIC_LAUNCH_2026_WRITE_RESUME_CONFIRMED/);

  for (const policyName of [
    "workos users can upload review images under own folder",
    "workos users can update own review images",
    "workos users can delete own review images",
    "workos users can upload their profile avatar",
    "workos users can update their profile avatar",
    "workos users can delete their profile avatar"
  ]) {
    assert.ok(pauseSql.includes(`drop policy if exists "${policyName}"`));
    assert.ok(resumeSql.includes(`create policy "${policyName}"`));
    assert.ok(launchSql.includes(`create policy "${policyName}"`));
  }

  assert.match(pauseSql, /revoke insert, update, delete, truncate on table public\.reviews from authenticated/);
  assert.match(resumeSql, /grant insert, update, delete on table public\.reviews to authenticated/);
  assert.match(launchSql, /grant insert, update, delete on table public\.reviews to authenticated/);
});
