-- RLSから呼ぶ関数は検索パスを固定し、将来追加される同名関数へ意図せず解決されないようにする。
-- auth.jwt()はスキーマを明示しているため、空のsearch_pathでも現在のWorkOS判定は変わらない。
alter function public.is_workos_authenticated() set search_path = '';
