import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/migrations/20260829041047_allow_account_image_listing.sql", import.meta.url);
const accountRouteUrl = new URL("../../app/api/account/route.ts", import.meta.url);
const accountScreenUrl = new URL("../../components/AccountSettingsScreen.tsx", import.meta.url);

test("アカウント削除用の画像一覧権限は本人のobject.listだけに限定する", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  assert.match(migration, /for select to authenticated/g);
  assert.equal(migration.match(/storage\.allow_only_operation\('object\.list'\)/g)?.length, 2);
  assert.match(migration, /bucket_id = 'review-images'[\s\S]*auth\.jwt\(\)[\s\S]*storage\.foldername\(name\)/);
  assert.match(migration, /bucket_id = 'profile-images'[\s\S]*auth\.jwt\(\)[\s\S]*'\/avatar'/);
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/);
});

test("アカウント削除は画像一覧と管理者の監査参照解除後に個人データを削除する", async () => {
  const route = await readFile(accountRouteUrl, "utf8");
  const storageCleanup = route.indexOf('removeOwnedFolder(supabase, "review-images"');
  const reviewAuditCleanup = route.indexOf('.from("reviews")');
  const reportAuditCleanup = route.indexOf('.from("review_reports")');
  const adminCleanup = route.indexOf('supabase.from("app_admins").delete()');
  const profileCleanup = route.indexOf('supabase.from("profiles").delete()');

  assert.ok(storageCleanup >= 0);
  assert.ok(reviewAuditCleanup > storageCleanup);
  assert.ok(reportAuditCleanup > reviewAuditCleanup);
  assert.ok(adminCleanup > reportAuditCleanup);
  assert.ok(profileCleanup > adminCleanup);
});

test("削除成功後のWorkOSリダイレクトをAPI失敗として画面表示しない", async () => {
  const screen = await readFile(accountScreenUrl, "utf8");
  const catchStart = screen.indexOf("} catch (deleteError) {");
  const redirectStart = screen.indexOf("await signOutAction();");

  assert.ok(catchStart >= 0);
  assert.ok(redirectStart > catchStart);
  assert.match(screen, /setDeleting\(false\);\n\s+return;/);
});
