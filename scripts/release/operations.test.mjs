import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sqlUrl = new URL("../../supabase/operations/purge-expired-moderation-data.sql.template", import.meta.url);

async function readPurgeSql() {
  return readFile(sqlUrl, "utf8");
}

test("expired moderation purge requires an explicit confirmation phrase", async () => {
  const sql = await readPurgeSql();

  assert.match(sql, /REPLACE_WITH_CONFIRMATION/);
  assert.match(sql, /PURGE_EXPIRED_MODERATION_DATA_CONFIRMED/);
  assert.match(sql, /raise exception/);
});

test("expired moderation purge only removes completed records older than one year", async () => {
  const sql = await readPurgeSql();
  const reportDelete = sql.match(/delete from public\.review_reports([\s\S]*?)returning id/i)?.[1] ?? "";
  const inquiryDelete = sql.match(/delete from public\.contact_inquiries([\s\S]*?)returning id/i)?.[1] ?? "";

  assert.match(reportDelete, /status in \('resolved', 'dismissed'\)/i);
  assert.match(reportDelete, /reviewed_at < now\(\) - interval '1 year'/i);
  assert.doesNotMatch(reportDelete, /pending/i);

  assert.match(inquiryDelete, /status = 'resolved'/i);
  assert.match(inquiryDelete, /handled_at < now\(\) - interval '1 year'/i);
  assert.doesNotMatch(inquiryDelete, /status = '(?:new|read)'/i);
});
