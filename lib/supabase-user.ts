/**
 * WorkOSユーザーとSupabaseのプロフィール・管理者登録を結び付けるサーバー専用ヘルパー。
 *
 * WorkOS subjectを唯一のユーザーIDとして扱い、Route Handlerごとの表示名推測や管理者判定の
 * 差をなくす。どちらの処理もWorkOS JWT付きClientでRLSを通るため、ブラウザの申告値は使わない。
 */
import type { createWorkOSSupabaseClient } from "@/lib/supabase-server";

type WorkOSSupabaseClient = ReturnType<typeof createWorkOSSupabaseClient>;

export type WorkOSProfileSeed = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

/**
 * WorkOSログイン後の初回操作でプロフィール行を用意する。
 * ignoreDuplicatesにより、プロフィール編集済みの名前・紹介文・画像は上書きしない。
 */
export async function ensureWorkOSProfile(supabase: WorkOSSupabaseClient, user: WorkOSProfileSeed) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email.split("@")[0] || "のみログユーザー";
  const { error } = await supabase.from("profiles").upsert(
    { user_id: user.id, name },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (error) throw error;
}

/**
 * JWT subject自身のapp_admins行だけを照合する。
 * trueを返すだけのクライアント状態は権限判定に使わず、管理APIとDB RLSの両方で同じ登録表を参照する。
 */
export async function isNomilogAdmin(supabase: WorkOSSupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("app_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
