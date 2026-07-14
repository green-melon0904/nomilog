-- 公開バケットはgetPublicUrlで個別ファイルを表示できるため、一覧取得を許可するSELECTポリシーは不要。
-- これを削除しても、レビューに保存した公開画像の表示URLは引き続き利用できる。
drop policy if exists "review images are public readable" on storage.objects;

-- これらのSECURITY DEFINER関数はDBトリガーからだけ使う。REST RPC経由で呼べる権限を残さない。
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_review_stats() from public, anon, authenticated;
revoke execute on function public.refresh_product_stats(uuid) from public, anon, authenticated;
