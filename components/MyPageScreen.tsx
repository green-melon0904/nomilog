"use client";

/**
 * ログイン前後で内容を切り替えるマイページ。
 *
 * 認証Cookieはクライアントへ直接公開せず、/api/auth/sessionが返す表示用ユーザー情報だけで
 * 画面を組み立てる。レビューの絞り込みも表示名ではなくWorkOS subjectで行い、同名ユーザーの
 * データ混在を防ぐ。
 */

import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  FileText,
  Heart,
  ImagePlus,
  LogOut,
  Mail,
  MessageSquareMore,
  Pencil,
  Star,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { RatingStars } from "@/components/RatingStars";
import {
  defaultProfileBio,
  maxProfileBioLength,
  maxProfileImageBytes,
  maxProfileNameLength,
  profileImageMimeTypes,
  type ProfileUpdateInput,
  type ProfileView
} from "@/lib/profile";
import { enrichProducts, getRanking } from "@/lib/nomilog-data";
import { hasSupabaseEnv } from "@/lib/supabase";
import type { ProductWithStats, Review } from "@/lib/types";
import { useNomilogProducts } from "@/components/useNomilogProducts";
import { useNomilogReviews } from "@/components/useNomilogReviews";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  bio: string;
  avatarUrl?: string;
  createdAt?: string;
};

/**
 * Supabase未設定時の表示名を、SSRとブラウザで同じ初期値から同期する。
 *
 * localStorageをuseStateの初期化中に読むと、サーバーの既定名とブラウザの保存名が最初から
 * 食い違ってHydration mismatchになる。外部ストアとして購読し、Hydration後にだけ保存値へ
 * 切り替えることで、ローカル確認モードの永続化とReactの描画整合性を両立する。
 */
function subscribeToLocalProfileName(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("nomilog:profile", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("nomilog:profile", onChange);
  };
}

function readLocalProfileName() {
  return window.localStorage.getItem("nomilog.profileName")?.trim() || "のみログユーザー";
}

function readServerProfileName() {
  return "のみログユーザー";
}

/**
 * Supabase未設定のローカル確認でも、紹介文と画像をプロフィールの一部として扱う。
 *
 * 本番のWorkOS + Supabase経路と画面の操作感を揃えるため、ローカル確認時だけ別のUIにせず
 * localStorageへ保存する。画像はData URLのまま端末に留め、認証済みの本番環境へは混ぜない。
 */
function readLocalProfileBio() {
  return window.localStorage.getItem("nomilog.profileBio") ?? defaultProfileBio;
}

function readServerProfileBio() {
  return defaultProfileBio;
}

function readLocalProfileAvatarUrl() {
  return window.localStorage.getItem("nomilog.profileAvatarUrl") ?? "";
}

function readServerProfileAvatarUrl() {
  return "";
}

/**
 * 認証状態を読み込み、ログイン前後のマイページを適切な状態で描画する。
 * 認証確認中・未ログイン・ログイン済みを分けて描画し、確認前に個人レビューを一瞬表示したり
 * 未ログイン画面へ誤って操作ボタンを出したりする状態を避ける。
 */
export function MyPageScreen() {
  const reviews = useNomilogReviews();
  const catalog = useNomilogProducts();
  const remoteEnabled = hasSupabaseEnv();
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-in" | "signed-out" | "unavailable">(remoteEnabled ? "loading" : "signed-in");
  const [remoteUser, setRemoteUser] = useState<AuthUser | null>(null);
  const localProfileName = useSyncExternalStore(subscribeToLocalProfileName, readLocalProfileName, readServerProfileName);
  const localProfileBio = useSyncExternalStore(subscribeToLocalProfileName, readLocalProfileBio, readServerProfileBio);
  const localProfileAvatarUrl = useSyncExternalStore(subscribeToLocalProfileName, readLocalProfileAvatarUrl, readServerProfileAvatarUrl);

  // 本番はWorkOS subject、Supabase未設定のローカル確認は固定IDで投稿者を特定する。
  // 表示名は変更や重複が起きるため、所有者判定に使わない。
  const myReviews = useMemo(
    () => reviews
      .filter((review) => remoteEnabled ? review.userId === remoteUser?.id : review.userId === "demo-user")
      .sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)),
    [remoteEnabled, remoteUser?.id, reviews]
  );
  const featuredProducts = useMemo(() => getRanking(reviews, 4, catalog), [catalog, reviews]);
  const allProducts = useMemo(() => enrichProducts(reviews, catalog), [catalog, reviews]);
  const profileName = remoteEnabled
    ? remoteUser?.name.trim() || remoteUser?.email.split("@")[0] || "のみログユーザー"
    : localProfileName;
  const profileBio = remoteEnabled ? remoteUser?.bio ?? defaultProfileBio : localProfileBio;
  const profileAvatarUrl = remoteEnabled ? remoteUser?.avatarUrl : localProfileAvatarUrl || undefined;

  useEffect(() => {
    if (!remoteEnabled) return;
    let active = true;

    // 暗号化されたWorkOS Cookieはクライアントで読まず、サーバーが返す最小表示情報だけを使う。
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => ({ data: await response.json() as { configured?: boolean; user?: AuthUser | null } }))
      .then(({ data }) => {
        if (!active) return;
        setRemoteUser(data.user ?? null);
        setAuthStatus(data.configured ? (data.user ? "signed-in" : "signed-out") : "unavailable");
      })
      .catch(() => {
        if (active) setAuthStatus("unavailable");
      });

    return () => {
      active = false;
    };
  }, [remoteEnabled]);

  function startAuth(mode: "sign-in" | "sign-up") {
    // 入口をログイン・新規登録で分けても、returnToの最終的な安全性はRoute Handler側で再検証する。
    // 認証後はマイページへ戻し、ユーザーが自分の状態を確認できる場所から再開する。
    window.location.assign(`${mode === "sign-up" ? "/sign-up" : "/sign-in"}?next=%2Fmypage`);
  }

  async function saveProfile(profile: ProfileUpdateInput) {
    if (!remoteEnabled) {
      // Supabase未設定のseed確認モードでも編集導線を試せるよう、表示名・紹介文・画像を端末へ保存する。
      // 本番データと混ざらないローカル確認用のフォールバックであり、WorkOS利用時はAPIへ送る。
      const previousName = window.localStorage.getItem("nomilog.profileName");
      const previousBio = window.localStorage.getItem("nomilog.profileBio");
      const previousAvatarUrl = window.localStorage.getItem("nomilog.profileAvatarUrl");
      try {
        // 容量を使う画像を先に保存し、途中で失敗した場合は以前の3項目すべてへ戻す。
        // 表示名だけが保存されてエラー表示になる部分成功を避け、リモート保存と同じ一括操作に寄せる。
        if (profile.removeAvatar) {
          window.localStorage.removeItem("nomilog.profileAvatarUrl");
        } else if (profile.avatarDataUrl) {
          window.localStorage.setItem("nomilog.profileAvatarUrl", profile.avatarDataUrl);
        }
        window.localStorage.setItem("nomilog.profileName", profile.name);
        window.localStorage.setItem("nomilog.profileBio", profile.bio);
      } catch {
        try {
          restoreLocalProfileValue("nomilog.profileName", previousName);
          restoreLocalProfileValue("nomilog.profileBio", previousBio);
          restoreLocalProfileValue("nomilog.profileAvatarUrl", previousAvatarUrl);
        } catch {
          // 保存領域自体が使えない場合も、元の容量エラーを利用者へ返す。
        }
        // Data URLは通常の文字列より大きく、端末の保存容量不足では例外になるため明確に案内する。
        throw new Error("画像を端末に保存できませんでした。別の画像を選んでください。");
      }
      window.dispatchEvent(new Event("nomilog:profile"));
      return;
    }

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });
    const result = await response.json().catch(() => null) as { error?: string; profile?: Partial<ProfileView> } | null;
    if (!response.ok) throw new Error(result?.error ?? "プロフィールの保存に失敗しました。");

    const savedProfile = result?.profile;
    setRemoteUser((current) => current ? {
      ...current,
      name: savedProfile?.name?.trim() || profile.name,
      bio: savedProfile?.bio ?? profile.bio,
      avatarUrl: savedProfile?.avatarUrl
    } : current);
    // 別画面のレビューカードにも変更後の投稿者名を再取得させ、プロフィールだけ古い名前を残さない。
    window.dispatchEvent(new Event("nomilog:reviews"));
  }

  const signedIn = !remoteEnabled || authStatus === "signed-in";
  const isLoading = remoteEnabled && authStatus === "loading";

  return (
    <div className="screen mypage-screen pb-8">
      <MyPageHeader />
      {isLoading ? <MyPageSkeleton /> : signedIn ? (
        <SignedInMyPage
          profileName={profileName}
          profileBio={profileBio}
          profileAvatarUrl={profileAvatarUrl}
          joinedAt={remoteUser?.createdAt}
          myReviews={myReviews}
          featuredProducts={featuredProducts}
          allProducts={allProducts}
          onProfileSaved={saveProfile}
        />
      ) : (
        <SignedOutMyPage
          authUnavailable={authStatus === "unavailable"}
          featuredProducts={featuredProducts}
          onStartAuth={startAuth}
        />
      )}
    </div>
  );
}

/**
 * localStorageの値を、保存操作前の「未設定」も含めて復元する。
 * setItemの失敗後に空文字で上書きすると既定値との区別が失われるため、値がなかったキーは削除して
 * ローカル確認モードの表示規則を保つ。
 */
function restoreLocalProfileValue(key: string, value: string | null) {
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value);
}

function MyPageHeader() {
  return (
    <header className="-mx-[18px] grid h-[72px] grid-cols-[1fr_auto_1fr] items-center border-b border-[var(--border)] px-[18px]">
      <Link href="/" className="text-[30px] font-bold leading-none tracking-[0] text-[var(--accent)]" aria-label="のみログ ホーム">
        <Image src="/nomilog-logo.png" alt="のみログ" width={826} height={229} priority className="h-auto w-[148px]" />
      </Link>
      <h1 className="text-[18px] leading-none">マイページ</h1>
      <span aria-hidden="true" />
    </header>
  );
}

function SignedOutMyPage({
  authUnavailable,
  featuredProducts,
  onStartAuth
}: {
  authUnavailable: boolean;
  featuredProducts: ProductWithStats[];
  onStartAuth: (mode: "sign-in" | "sign-up") => void;
}) {
  return (
    <div className="pt-4">
      <section className="app-card p-5">
        <div className="flex items-start gap-4">
          <ProfileAvatar />
          <div className="min-w-0 pt-1">
            <h2 className="text-[22px] leading-tight">ログインしてもっと便利に</h2>
            <p className="mt-2 text-[13px] font-normal leading-[1.75] text-[#4b5158]">
              お気に入りのドリンクを保存したり、レビューを投稿したり、プロフィールを管理できます。
            </p>
          </div>
        </div>
        {authUnavailable ? (
          <p className="mt-5 rounded-[8px] bg-[var(--surface-soft)] px-4 py-3 text-center text-[13px] font-normal text-[var(--muted)]">
            ログイン機能を準備中です。
          </p>
        ) : (
          <div className="mt-5 grid gap-3">
            <button type="button" onClick={() => onStartAuth("sign-in")} className="tap-target rounded-[14px] bg-[var(--accent)] px-4 text-[16px] !text-white shadow-[0_5px_14px_rgba(42,155,225,0.22)]">
              ログイン
            </button>
            <button type="button" onClick={() => onStartAuth("sign-up")} className="tap-target rounded-[14px] border border-[var(--accent)] bg-white px-4 text-[16px] text-[var(--accent)]">
              新規登録
            </button>
          </div>
        )}
      </section>

      <section className="pt-6">
        <SectionTitle title="ログインするとできること" />
        <div className="soft-card overflow-hidden">
          <FeatureRow icon={Heart} title="お気に入りを保存" description="気に入ったドリンクを保存して、いつでも見返せます。" />
          <FeatureRow icon={MessageSquareMore} title="レビューを投稿" description="飲んだドリンクの感想を投稿して共有できます。" />
          <FeatureRow icon={UserRound} title="購入履歴やプロフィールを管理" description="自分のプロフィールや購入履歴をまとめて管理できます。" />
        </div>
      </section>

      <ProductStrip title="人気のドリンク" products={featuredProducts} heartStyle="filled" />

      <section className="pt-6">
        <SectionTitle title="サポート・その他" />
        <div className="soft-card overflow-hidden">
          <SupportRow icon={CircleHelp} label="ヘルプ" />
          <SupportRow icon={Mail} label="お問い合わせ" />
          <SupportRow icon={FileText} label="利用規約" />
        </div>
      </section>
    </div>
  );
}

function SignedInMyPage({
  profileName,
  profileBio,
  profileAvatarUrl,
  joinedAt,
  myReviews,
  featuredProducts,
  allProducts,
  onProfileSaved
}: {
  profileName: string;
  profileBio: string;
  profileAvatarUrl?: string;
  joinedAt?: string;
  myReviews: Review[];
  featuredProducts: ProductWithStats[];
  allProducts: ProductWithStats[];
  onProfileSaved: (profile: ProfileUpdateInput) => Promise<void>;
}) {
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const joinedLabel = joinedAt ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(joinedAt)) : "メールコードで認証済み";
  const recentReviews = myReviews.slice(0, 2);
  const savedProducts = featuredProducts.length > 0 ? featuredProducts : allProducts.slice(0, 4);

  return (
    <div className="pt-4">
      <ProfileEditDialog
        key={profileEditorOpen ? `${profileName}:${profileBio}:${profileAvatarUrl ?? "default"}` : "closed"}
        open={profileEditorOpen}
        initialName={profileName}
        initialBio={profileBio}
        initialAvatarUrl={profileAvatarUrl}
        onClose={() => setProfileEditorOpen(false)}
        onSaved={onProfileSaved}
      />
      <section className="app-card p-2.5 sm:p-3">
        <div className="flex items-start gap-3">
          <ProfileAvatar large avatarUrl={profileAvatarUrl} />
          <div className="relative min-w-0 flex-1 pt-0.5">
            <button type="button" onClick={() => setProfileEditorOpen(true)} title="プロフィールを編集" className="tap-target absolute right-0 top-0 grid border-0 bg-transparent p-0 text-[var(--accent)]">
              <span className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--accent)] px-2 text-[10px]"><Pencil className="h-3 w-3" strokeWidth={1.9} />プロフィール編集</span>
            </button>
            <div className="min-w-0 pr-[112px]">
              <h2 className="truncate text-[20px] leading-[1.15]">{profileName}</h2>
              {profileBio ? <p className="mt-1 line-clamp-2 text-[11px] font-normal leading-[1.35] text-[#454b52]">{profileBio}</p> : null}
            </div>
            <p className={`${profileBio ? "mt-2" : "mt-1"} inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-normal text-[var(--muted)]`}>
              <CalendarDays className="h-3 w-3" strokeWidth={1.7} /> 登録日 {joinedLabel}
            </p>
          </div>
        </div>
        <div className="mt-2 grid min-h-8 grid-cols-3 border-t border-[var(--border)] pt-1.5">
          <ProfileMetric icon={MessageSquareMore} label="レビュー" value={myReviews.length} />
          <ProfileMetric icon={Heart} label="お気に入り" value={0} bordered />
          <ProfileMetric icon={Bookmark} label="保存" value={0} bordered />
        </div>
      </section>

      <section className="pt-6">
        <SectionTitle title="投稿したレビュー" actionHref="/reviews" />
        {recentReviews.length > 0 ? (
          <div className="space-y-2">
            {recentReviews.map((review) => <PostedReviewCard key={review.id} review={review} products={allProducts} />)}
          </div>
        ) : (
          <Link href="/reviews/new" className="soft-card flex min-h-[100px] items-center justify-between gap-4 px-5">
            <div>
              <p className="text-[15px]">まだレビューを投稿していません</p>
              <p className="mt-1 text-[12px] font-normal text-[var(--muted)]">最初のドリンクレビューを書いてみましょう。</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={1.8} />
          </Link>
        )}
      </section>

      <ProductStrip title="お気に入りドリンク" products={savedProducts} heartStyle="filled" />

      <section className="pt-6">
        <SectionTitle title="よく買う場所" />
        <div className="flex flex-wrap gap-2">
          {["セブン-イレブン", "ローソン", "ファミマ", "自販機"].map((location) => (
            <span key={location} className="rounded-full border border-[var(--accent)] px-4 py-1.5 text-[13px] text-[var(--accent)]">{location}</span>
          ))}
        </div>
      </section>

      <section className="pt-6">
        <SectionTitle title="設定" />
        <div className="soft-card overflow-hidden">
          <SupportRow icon={UserRound} label="プロフィール編集" onClick={() => setProfileEditorOpen(true)} />
          <SupportRow icon={Bell} label="通知設定" />
          <SupportRow icon={Heart} label="お気に入り管理" />
          <Link href="/sign-out" className="tap-target flex items-center gap-4 border-b-0 px-5 text-[15px] text-[var(--text)]">
            <LogOut className="h-5 w-5 text-[var(--text)]" strokeWidth={1.7} />
            <span className="flex-1">ログアウト</span>
            <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
          </Link>
        </div>
      </section>
    </div>
  );
}

/**
 * マイページから表示名・紹介文・プロフィール画像を編集するモーダル。
 *
 * 編集内容を即時保存せず、保存ボタンを押したときだけAPIへ送る。画像は選択直後に端末内で
 * プレビューし、保存成功まで公開URLへ切り替えない。入力中に別画面へ移動してもレビューの
 * 未保存状態とは別の短い操作なので、確認ダイアログは増やさずEscapeとキャンセルで閉じられる。
 */
function ProfileEditDialog({
  open,
  initialName,
  initialBio,
  initialAvatarUrl,
  onClose,
  onSaved
}: {
  open: boolean;
  initialName: string;
  initialBio: string;
  initialAvatarUrl?: string;
  onClose: () => void;
  onSaved: (profile: ProfileUpdateInput) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | undefined>();
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const avatarReadId = useRef(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewAvatarUrl = removeAvatar ? undefined : avatarDataUrl ?? initialAvatarUrl;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, saving]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.normalize("NFKC").trim();
    const normalizedBio = bio.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
    if (!normalizedName || normalizedName.length > maxProfileNameLength || /[\u0000-\u001f\u007f]/.test(normalizedName)) {
      setError(`表示名は1〜${maxProfileNameLength}文字で入力してください。`);
      return;
    }
    if (normalizedBio.length > maxProfileBioLength || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(normalizedBio)) {
      setError(`紹介文は${maxProfileBioLength}文字以内で入力してください。`);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaved({
        name: normalizedName,
        bio: normalizedBio,
        avatarDataUrl,
        removeAvatar
      });
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "プロフィールの保存に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 同じファイルを選び直したときもchangeイベントが発火するよう、選択値をすぐに空に戻す。
    event.target.value = "";
    // 新しい選択操作が始まった時点で、以前のFileReader結果は採用しない。
    // 形式エラーのファイルを選んだ場合も、読み込み中だった古い画像が後から復活しないようにする。
    const readId = ++avatarReadId.current;
    setIsAvatarLoading(false);
    if (!file) return;

    if (!profileImageMimeTypes.includes(file.type as (typeof profileImageMimeTypes)[number])) {
      setError("画像はJPEG・PNG・WebP形式を選んでください。HEIC形式には対応していません。");
      return;
    }
    if (file.size > maxProfileImageBytes) {
      setError("画像サイズは2MB以下にしてください。");
      return;
    }

    setIsAvatarLoading(true);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      // 連続して画像を選んだとき、先に始めたFileReaderの完了結果で新しい選択を上書きしない。
      if (readId !== avatarReadId.current) return;
      if (typeof reader.result !== "string") {
        setError("画像を読み込めませんでした。別の画像を選んでください。");
        setIsAvatarLoading(false);
        return;
      }
      setAvatarDataUrl(reader.result);
      setRemoveAvatar(false);
      setError(null);
      setIsAvatarLoading(false);
    });
    reader.addEventListener("error", () => {
      if (readId !== avatarReadId.current) return;
      setError("画像を読み込めませんでした。別の画像を選んでください。");
      setIsAvatarLoading(false);
    });
    reader.readAsDataURL(file);
  }

  function removeProfileAvatar() {
    // 保留中の読み込みも無効化し、削除操作の後に古い読込結果が復活しないようにする。
    avatarReadId.current += 1;
    setIsAvatarLoading(false);
    setAvatarDataUrl(undefined);
    setRemoveAvatar(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(22,25,29,0.35)] px-4 pb-4 pt-10 sm:items-center">
      <div role="dialog" aria-modal="true" aria-labelledby="profile-edit-title" aria-describedby="profile-edit-description" className="app-card max-h-[calc(100dvh-32px)] w-full max-w-[420px] overflow-y-auto p-5 shadow-[0_18px_45px_rgba(17,24,39,0.2)]">
        <div className="flex items-center justify-between gap-4">
          <h2 id="profile-edit-title" className="text-[19px]">プロフィールを編集</h2>
          <button type="button" onClick={onClose} disabled={saving} aria-label="プロフィール編集を閉じる" title="閉じる" className="tap-target grid w-11 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--surface-soft)] disabled:opacity-50">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <p id="profile-edit-description" className="mt-2 text-[12px] font-normal leading-relaxed text-[var(--muted)]">レビューやマイページに表示する情報を変更できます。</p>
        <form onSubmit={handleSubmit} className="mt-5">
          <fieldset>
            <legend className="text-[13px]">プロフィール画像</legend>
            <div className="mt-2 flex items-center gap-3">
              <ProfileAvatar large avatarUrl={previewAvatarUrl} />
              <div className="min-w-0 flex-1 space-y-2">
                <input id="profile-avatar" type="file" accept={profileImageMimeTypes.join(",")} onChange={handleAvatarChange} disabled={saving} className="sr-only" />
                <label htmlFor="profile-avatar" className={`tap-target inline-flex cursor-pointer items-center gap-2 rounded-[10px] border border-[var(--accent)] px-3 text-[13px] text-[var(--accent)] ${saving ? "pointer-events-none opacity-50" : ""}`}>
                  <ImagePlus className="h-4 w-4" strokeWidth={1.8} />{isAvatarLoading ? "画像を読み込み中…" : "画像を変更"}
                </label>
                {previewAvatarUrl ? (
                  <button type="button" onClick={removeProfileAvatar} disabled={saving} className="tap-target inline-flex items-center px-2 text-[12px] text-[var(--muted)] underline underline-offset-2 disabled:opacity-50">
                    画像を削除
                  </button>
                ) : null}
                <p className="text-[10px] font-normal leading-relaxed text-[var(--muted)]">JPEG・PNG・WebP、2MBまで</p>
              </div>
            </div>
          </fieldset>

          <div className="mt-5">
          <label htmlFor="profile-name" className="text-[13px]">表示名</label>
          <input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={maxProfileNameLength}
            required
            autoComplete="nickname"
            autoFocus
            aria-invalid={Boolean(error)}
            className="mt-2 min-h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-4 text-[16px] outline-none transition-colors focus:border-[var(--accent)]"
          />
          <div className="mt-2 flex justify-between gap-3 text-[11px] font-normal text-[var(--muted)]">
            <span>1〜{maxProfileNameLength}文字</span>
            <span>{name.length}/{maxProfileNameLength}</span>
          </div>
          </div>

          <div className="mt-5">
            <label htmlFor="profile-bio" className="text-[13px]">紹介文</label>
            <textarea
              id="profile-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={maxProfileBioLength}
              rows={2}
              autoComplete="off"
              aria-invalid={Boolean(error)}
              className="mt-2 min-h-[76px] w-full resize-none rounded-[10px] border border-[var(--border)] bg-white px-4 py-3 text-[16px] leading-relaxed outline-none transition-colors focus:border-[var(--accent)]"
            />
            <div className="mt-2 flex justify-between gap-3 text-[11px] font-normal text-[var(--muted)]">
              <span>空欄にすると非表示になります</span>
              <span>{bio.length}/{maxProfileBioLength}</span>
            </div>
          </div>
          {error ? <p role="alert" className="mt-3 rounded-[8px] bg-[#fff1f2] px-3 py-2 text-[12px] text-[#c53d47]">{error}</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} disabled={saving} className="tap-target rounded-[10px] border border-[var(--border)] bg-white px-4 text-[14px] disabled:opacity-50">キャンセル</button>
            <button type="submit" disabled={saving || isAvatarLoading} className="tap-target rounded-[10px] bg-[var(--accent)] px-4 text-[14px] !text-white shadow-[0_5px_14px_rgba(42,155,225,0.2)] disabled:opacity-60">{saving ? "保存中…" : isAvatarLoading ? "画像を読み込み中…" : "保存する"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * 画像未設定時もレイアウトを崩さないプロフィールアイコン。
 * ユーザー画像の取得失敗をプロフィール全体の表示失敗にしないため、初期状態から固定サイズ
 * の代替アイコンを置き、公開Storage画像はその上に重ねる。画像URLが壊れても下の代替アイコンが
 * 残るため、プロフィールカードの寸法や意味を失わない。
 */
function ProfileAvatar({ large = false, avatarUrl }: { large?: boolean; avatarUrl?: string }) {
  // ログイン後はプロフィール情報を横に並べるため60pxへ縮め、未ログイン案内では視線を集める104pxを保つ。
  // 同じ部品を使い回すことで、アイコンの代替表示が画面ごとに別実装へ分岐しないようにする。
  const size = large ? "h-[60px] w-[60px]" : "h-[104px] w-[104px]";
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ${size}`}>
      <UserRound className={large ? "h-8 w-8" : "h-14 w-14"} strokeWidth={1.35} />
      {avatarUrl ? (
        // Storageの公開URLと編集時のData URLを同じ部品でプレビューするため、next/imageのリモート設定に
        // 依存しないimgを使う。画像の失敗時は要素を隠し、背面の固定代替アイコンを表示し続ける。
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
    </span>
  );
}

/**
 * プロフィールカード内のレビュー・お気に入り・保存件数を同じレイアウトで表示する。
 * 件数が0や未実装でも列幅を保つことで、ログイン前後や将来の集計追加でカード全体が揺れない
 * ようにする。値の取得は呼び出し側へ残し、表示部品はレイアウトだけを担当する。
 */
function ProfileMetric({ icon: Icon, label, value, bordered = false }: { icon: typeof Heart; label: string; value: number; bordered?: boolean }) {
  return (
    <div className={`flex min-w-0 items-center justify-center gap-1.5 px-1 ${bordered ? "border-l border-[var(--border)]" : ""}`}>
      <Icon className="h-5 w-5 shrink-0 text-[var(--accent)]" strokeWidth={1.75} />
      <div>
        <p className="truncate text-[9px] font-normal text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-[15px] leading-none">{value}</p>
      </div>
    </div>
  );
}

/**
 * 投稿者本人のレビューを、商品登録の有無にかかわらず一覧表示する。
 * 未登録飲料を商品詳細へ無理にリンクすると存在しないページへ遷移するため、商品がない場合は
 * レビュー一覧へ戻す導線にし、投稿内容と入力した商品名はそのまま表示する。
 */
function PostedReviewCard({ review, products }: { review: Review; products: ProductWithStats[] }) {
  const product = products.find((item) => item.id === review.productId);
  const name = product?.name ?? review.productName ?? "名称未入力のドリンク";

  return (
    <Link href={product ? `/products/${product.id}` : "/reviews"} className="soft-card flex min-h-[106px] items-center gap-4 px-4 py-3">
      <span className="relative h-[78px] w-[74px] shrink-0 overflow-hidden rounded-[8px] bg-white">
        {product ? <Image src={product.imageUrl} alt="" fill sizes="74px" className="object-contain p-1" /> : <MessageSquareMore className="absolute inset-0 m-auto h-7 w-7 text-[var(--accent)]" strokeWidth={1.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px]">{name}</span>
        <span className="mt-1 flex items-center gap-2"><RatingStars value={review.rating} /><span className="text-[12px] text-[var(--text)]">{review.rating.toFixed(1)}</span></span>
        <span className="mt-1 block truncate text-[12px] font-normal text-[#4b5158]">{review.comment}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.7} />
    </Link>
  );
}

function ProductStrip({ title, products, heartStyle }: { title: string; products: ProductWithStats[]; heartStyle: "filled" | "outline" }) {
  return (
    <section className="pt-6">
      <SectionTitle title={title} actionHref="/search" />
      <div className="scrollbar-none -mx-[18px] flex gap-3 overflow-x-auto px-[18px] pb-1">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.id}`} className="soft-card relative w-[138px] shrink-0 overflow-hidden p-3">
            <Heart className={`absolute right-2 top-2 h-5 w-5 ${heartStyle === "filled" ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--accent)]"}`} strokeWidth={1.8} />
            <span className="relative mx-auto block h-[94px] w-full"><Image src={product.imageUrl} alt={product.name} fill sizes="138px" className="object-contain" /></span>
            <span className="mt-2 block line-clamp-2 text-[12px] leading-snug text-[var(--text)]">{product.name}</span>
            <span className="mt-2 flex items-center gap-1 text-[12px] text-[var(--star)]"><Star className="h-4 w-4 fill-[var(--star)]" strokeWidth={1.5} />{product.avgRating.toFixed(1)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SectionTitle({ title, actionHref }: { title: string; actionHref?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[19px] leading-none">{title}</h2>
      {actionHref ? <Link href={actionHref} className="tap-target inline-flex items-center gap-0.5 text-[13px] text-[var(--accent)]">すべて見る <ChevronRight className="h-4 w-4" strokeWidth={1.8} /></Link> : null}
    </div>
  );
}

function FeatureRow({ icon: Icon, title, description }: { icon: typeof Heart; title: string; description: string }) {
  return (
    <div className="flex min-h-[78px] items-center gap-4 border-b border-[var(--border)] px-5 last:border-b-0">
      <Icon className="h-9 w-9 shrink-0 text-[var(--accent)]" strokeWidth={1.65} />
      <div className="min-w-0 flex-1"><p className="text-[15px]">{title}</p><p className="mt-1 truncate text-[11px] font-normal text-[var(--muted)]">{description}</p></div>
      <ChevronRight className="h-5 w-5 shrink-0" strokeWidth={1.7} />
    </div>
  );
}

function SupportRow({ icon: Icon, label, onClick }: { icon: typeof Heart; label: string; onClick?: () => void }) {
  const content = (
    <>
      <Icon className="h-5 w-5 text-[var(--text)]" strokeWidth={1.7} />
      <span className="flex-1 text-left text-[15px]">{label}</span>
      <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="tap-target flex min-h-[56px] w-full items-center gap-4 border-b border-[var(--border)] px-5 last:border-b-0">
      {content}
    </button>
  ) : (
    <div className="flex min-h-[56px] items-center gap-4 border-b border-[var(--border)] px-5 last:border-b-0">
      {content}
    </div>
  );
}

function MyPageSkeleton() {
  return <div className="space-y-5 pt-4"><div className="h-52 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" /><div className="h-56 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" /></div>;
}
