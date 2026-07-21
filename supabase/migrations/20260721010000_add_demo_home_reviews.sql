-- このファイルは、既存の確認環境へダミーレビューを投入した履歴を保つためのマイグレーション記録。
-- 将来の公開用DBを新規構築する時に仮レビューを入れないよう、実データのINSERTは
-- supabase/seeds/demo-home-reviews.sqlへ分離している。公開前の確認環境だけで同seedを明示実行する。

-- ダミーデータを再投入する必要がある場合は、次のseedを使用する。
-- supabase/seeds/demo-home-reviews.sql
