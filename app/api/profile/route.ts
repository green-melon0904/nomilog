/**
 * ログイン中のユーザーが自分のプロフィール情報を更新するRoute Handler。
 *
 * ブラウザからuser_idを受け取らず、WorkOSのJWT subjectを保存対象に使うことで、入力値の差し替え
 * だけで他ユーザーのプロフィールを書き換えられないようにする。画像を含む保存処理もSupabaseの
 * RLSを通し、画面側の認証ガードを迂回したリクエストへ同じ本人確認を適用する。
 */
import { randomUUID } from "node:crypto";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";
import { readImageDataUrl } from "@/lib/image-data-url";
import {
  defaultProfileBio,
  maxProfileBioLength,
  maxProfileImageBytes,
  maxProfileNameLength,
  type ProfileUpdateInput
} from "@/lib/profile";
import { readJsonBodyWithinLimit, RequestBodyTooLargeError } from "@/lib/request-body";
import { isSameOriginRequest } from "@/lib/request-security";
import { createWorkOSSupabaseClient } from "@/lib/supabase-server";
import { hasWorkOSAuthConfig } from "@/lib/workos";

const profileImagesBucket = "profile-images";
// 2MB画像をData URLで送ると約2.67MBになる。フォーム項目分の余白を加え、画像以外の巨大JSONは受け付けない。
const maxProfileRequestBytes = 3 * 1024 * 1024;

type ValidProfileUpdate = Required<Pick<ProfileUpdateInput, "name" | "bio">> & {
  avatarDataUrl?: string;
  removeAvatar: boolean;
  avatarChanged: boolean;
};

type UploadedProfileImage = {
  path: string;
  publicUrl: string;
};

/**
 * 表示名・紹介文・画像操作を、保存可能なプロフィール入力へ整える。
 *
 * 表示名は空にできないが、紹介文の空文字は本人が非表示を選んだ状態として許す。改行は紹介文だけ
 * 許可し、それ以外の制御文字・過長値・形式偽装された画像はDBやStorageへ送る前に拒否する。
 */
function parseProfileUpdate(value: unknown): ValidProfileUpdate | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const name = normalizeProfileName(input.name);
  const bio = normalizeProfileBio(input.bio);
  const avatarDataUrl = input.avatarDataUrl;
  const removeAvatar = input.removeAvatar;

  if (!name || bio === null || (avatarDataUrl !== undefined && typeof avatarDataUrl !== "string")) return null;
  if (removeAvatar !== undefined && typeof removeAvatar !== "boolean") return null;
  if (avatarDataUrl !== undefined && (!avatarDataUrl || !readImageDataUrl(avatarDataUrl, maxProfileImageBytes))) return null;

  const shouldRemoveAvatar = removeAvatar === true;
  if (avatarDataUrl && shouldRemoveAvatar) return null;

  return {
    name,
    bio,
    avatarDataUrl,
    removeAvatar: shouldRemoveAvatar,
    avatarChanged: Boolean(avatarDataUrl) || shouldRemoveAvatar
  };
}

function normalizeProfileName(value: unknown) {
  if (typeof value !== "string") return null;

  const normalizedName = value.normalize("NFKC").trim();
  if (
    !normalizedName ||
    normalizedName.length > maxProfileNameLength ||
    /[\u0000-\u001f\u007f]/.test(normalizedName)
  ) {
    return null;
  }

  return normalizedName;
}

function normalizeProfileBio(value: unknown) {
  if (typeof value !== "string") return null;

  const normalizedBio = value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
  if (
    normalizedBio.length > maxProfileBioLength ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalizedBio)
  ) {
    return null;
  }

  return normalizedBio;
}

export async function PATCH(request: NextRequest) {
  if (!hasWorkOSAuthConfig()) {
    return NextResponse.json({ error: "ログイン設定が完了していません。" }, { status: 503 });
  }

  // Cookieを使う状態変更は同一オリジンからだけ受け付け、別サイト経由のCSRFを防ぐ。
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "不正なリクエストです。" }, { status: 403 });
  }

  const auth = await withAuth();
  if (!auth.user || !auth.accessToken) {
    return NextResponse.json({ error: "プロフィール編集にはログインが必要です。" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await readJsonBodyWithinLimit(request, maxProfileRequestBytes);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "プロフィール画像を含む入力は3MB以下にしてください。" }, { status: 413 });
    }
    return NextResponse.json({ error: "入力内容を確認してください。" }, { status: 400 });
  }
  const profile = parseProfileUpdate(payload);
  if (!profile) {
    return NextResponse.json({ error: `表示名は1〜${maxProfileNameLength}文字、紹介文は${maxProfileBioLength}文字以内で入力してください。` }, { status: 400 });
  }

  try {
    const supabase = createWorkOSSupabaseClient(auth.accessToken);
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (existingProfileError) throw existingProfileError;

    let uploadedImage: UploadedProfileImage | undefined;

    try {
      if (profile.avatarDataUrl) {
        uploadedImage = await uploadProfileImage(supabase, auth.user.id, profile.avatarDataUrl);
      }

      const avatarUrl = uploadedImage?.publicUrl ?? (profile.removeAvatar ? null : existingProfile?.avatar_url ?? null);
      const profileRow: {
        user_id: string;
        name: string;
        bio: string;
        avatar_url?: string | null;
      } = {
        user_id: auth.user.id,
        name: profile.name,
        bio: profile.bio
      };

      // 画像を変更しない保存ではavatar_urlをupsert対象から外し、既存画像を意図せずnullで上書きしない。
      if (profile.avatarChanged) profileRow.avatar_url = avatarUrl;

      const { data: savedProfile, error } = await supabase
        .from("profiles")
        .upsert(profileRow, { onConflict: "user_id" })
        .select("name,bio,avatar_url")
        .single();
      if (error) throw error;

      // 新しいURLを先にプロフィールへ反映してから、固定avatarパスとは異なる旧ファイルだけを削除する。
      // 同じパスを上書きした画像は消すと最新画像まで失うため、URLではなくStorageパスで比較する。
      const existingAvatarPath = existingProfile?.avatar_url ? getOwnedProfileImagePath(existingProfile.avatar_url, auth.user.id) : null;
      if (profile.avatarChanged && existingProfile?.avatar_url && existingAvatarPath && existingAvatarPath !== uploadedImage?.path) {
        await deleteOwnedProfileImage(supabase, existingProfile.avatar_url, auth.user.id).catch((error) => {
          console.warn("[profile] previous avatar cleanup failed", error);
        });
      }

      return NextResponse.json({
        profile: {
          name: savedProfile.name,
          bio: savedProfile.bio ?? defaultProfileBio,
          avatarUrl: savedProfile.avatar_url ?? undefined
        }
      });
    } catch (error) {
      // DB更新に失敗したときだけ新規アップロード分を掃除する。既存画像はまだ表示に使われるため触らない。
      if (uploadedImage) {
        await supabase.storage.from(profileImagesBucket).remove([uploadedImage.path]).catch((cleanupError) => {
          console.warn("[profile] failed avatar cleanup after save failure", cleanupError);
        });
      }
      throw error;
    }
  } catch (error) {
    // SupabaseやRLSの内部エラーをそのまま返さず、設定値やDB構造の露出を避ける。
    console.error("[profile] profile update failed", error);
    return NextResponse.json({ error: "プロフィールの保存に失敗しました。時間をおいてもう一度お試しください。" }, { status: 500 });
  }
}

/**
 * 検証済みプロフィール画像を、ユーザーごとに一つの固定パスへ保存する。
 * 一意パスを増やす方式は複数タブからの同時保存で未参照ファイルを残し得るため採用しない。上書き後の
 * CDNキャッシュはURLのバージョン値で回避し、Storage内の画像を常に一つに保つ。
 */
async function uploadProfileImage(
  supabase: ReturnType<typeof createWorkOSSupabaseClient>,
  userId: string,
  imageDataUrl: string
): Promise<UploadedProfileImage> {
  const image = readImageDataUrl(imageDataUrl, maxProfileImageBytes);
  if (!image) throw new Error("Invalid profile image payload");

  const path = `${userId}/avatar`;
  const { error } = await supabase.storage.from(profileImagesBucket).upload(path, image.bytes, {
    contentType: image.type,
    upsert: true
  });
  if (error) throw error;

  return {
    path,
    publicUrl: `${supabase.storage.from(profileImagesBucket).getPublicUrl(path).data.publicUrl}?v=${randomUUID()}`
  };
}

/**
 * 公開URLから自分のプロフィール画像パスだけを取り出し、Storageから削除する。
 * URL文字列をそのままStorage APIへ渡すと任意のパスを消せる実装になり得るため、バケット名と
 * WorkOS subject配下であることを確認してから削除対象にする。
 */
async function deleteOwnedProfileImage(
  supabase: ReturnType<typeof createWorkOSSupabaseClient>,
  avatarUrl: string,
  userId: string
) {
  const path = getOwnedProfileImagePath(avatarUrl, userId);
  if (!path) return;

  const { error } = await supabase.storage.from(profileImagesBucket).remove([path]);
  if (error) throw error;
}

function getOwnedProfileImagePath(avatarUrl: string, userId: string) {
  try {
    const publicPathPrefix = `/storage/v1/object/public/${profileImagesBucket}/`;
    const pathname = new URL(avatarUrl).pathname;
    if (!pathname.startsWith(publicPathPrefix)) return null;

    const path = decodeURIComponent(pathname.slice(publicPathPrefix.length));
    if (!path.startsWith(`${userId}/`) || path.includes("..")) return null;
    return path;
  } catch {
    return null;
  }
}
