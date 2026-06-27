import { createBrowserClient } from "@supabase/ssr";

export function hasSupabaseEnv() {
  // NEXT_PUBLIC_* の2つが揃っている場合だけSupabase連携を有効にする。
  // 片方だけ設定された中途半端な状態では、ローカルデモとして扱って画面を壊さない。
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  // ブラウザコンポーネントからAuthセッションとDB/Storageを使うためのクライアント。
  // Server Clientはまだ使わず、MVPでは画面内の投稿・ログイン体験に範囲を絞る。
  return createBrowserClient(url, anonKey);
}
