/**
 * プロフィール編集でクライアント・Route Handler・DBが共有する入力上限と既定値。
 *
 * 表示名や紹介文の上限を画面側だけに置くと、直接APIを呼ぶリクエストと画面表示の制約がずれる。
 * このモジュールに集約し、操作性のための即時検証と保存境界の検証を同じ仕様に保つ。
 */

export const defaultProfileBio = "炭酸とお茶が好き";
export const maxProfileNameLength = 30;
export const maxProfileBioLength = 80;
export const maxProfileImageBytes = 2 * 1024 * 1024;
export const profileImageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type ProfileImageMimeType = (typeof profileImageMimeTypes)[number];

/**
 * 編集ダイアログからプロフィールAPIへ渡す保存要求。
 * avatarDataUrlは新しい画像を選んだ場合だけ送り、removeAvatarは既存画像を初期アイコンへ
 * 戻す明示的な操作として分ける。両方を同時に許可すると、どちらを優先するか曖昧になるため
 * Route Handlerで拒否する。
 */
export type ProfileUpdateInput = {
  name: string;
  bio: string;
  avatarDataUrl?: string;
  removeAvatar?: boolean;
};

/**
 * マイページ表示に必要な、認証情報を含まないプロフィール情報。
 */
export type ProfileView = {
  name: string;
  bio: string;
  avatarUrl?: string;
};
