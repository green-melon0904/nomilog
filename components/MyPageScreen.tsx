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
  LogOut,
  Mail,
  MessageSquareMore,
  Pencil,
  Star,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RatingStars } from "@/components/RatingStars";
import { enrichProducts, getRanking } from "@/lib/nomilog-data";
import { hasSupabaseEnv } from "@/lib/supabase";
import type { ProductWithStats, Review } from "@/lib/types";
import { useNomilogProducts } from "@/components/useNomilogProducts";
import { useNomilogReviews } from "@/components/useNomilogReviews";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  createdAt?: string;
};

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
  const profileName = remoteUser?.name.trim() || remoteUser?.email.split("@")[0] || "のみログユーザー";

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

  const signedIn = !remoteEnabled || authStatus === "signed-in";
  const isLoading = remoteEnabled && authStatus === "loading";

  return (
    <div className="screen mypage-screen pb-8">
      <MyPageHeader />
      {isLoading ? <MyPageSkeleton /> : signedIn ? (
        <SignedInMyPage
          profileName={profileName}
          joinedAt={remoteUser?.createdAt}
          myReviews={myReviews}
          featuredProducts={featuredProducts}
          allProducts={allProducts}
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
  joinedAt,
  myReviews,
  featuredProducts,
  allProducts
}: {
  profileName: string;
  joinedAt?: string;
  myReviews: Review[];
  featuredProducts: ProductWithStats[];
  allProducts: ProductWithStats[];
}) {
  const joinedLabel = joinedAt ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(joinedAt)) : "メールコードで認証済み";
  const recentReviews = myReviews.slice(0, 2);
  const savedProducts = featuredProducts.length > 0 ? featuredProducts : allProducts.slice(0, 4);

  return (
    <div className="pt-4">
      <section className="app-card p-5">
        <div className="flex items-start gap-4">
          <ProfileAvatar large />
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-[25px] leading-none">{profileName}</h2>
                <p className="mt-2 text-[14px] font-normal text-[#454b52]">炭酸とお茶が好き</p>
              </div>
              <button type="button" title="プロフィール編集は準備中です" className="tap-target shrink-0 rounded-full border border-[var(--accent)] px-3 text-[12px] text-[var(--accent)]">
                <span className="inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />プロフィール編集</span>
              </button>
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-normal text-[var(--muted)]">
              <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.7} /> 登録日 {joinedLabel}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 border-t border-[var(--border)] pt-3">
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
          <SupportRow icon={UserRound} label="プロフィール編集" />
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
 * 画像未設定時もレイアウトを崩さないプロフィールアイコン。
 * ユーザー画像の取得失敗をプロフィール全体の表示失敗にしないため、初期状態から固定サイズ
 * の代替アイコンを使い、後から画像対応を追加してもカードの寸法を変えない。
 */
function ProfileAvatar({ large = false }: { large?: boolean }) {
  const size = large ? "h-[104px] w-[104px]" : "h-[104px] w-[104px]";
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[var(--accent)] ${size}`}>
      <UserRound className={large ? "h-14 w-14" : "h-14 w-14"} strokeWidth={1.35} />
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
    <div className={`flex items-center justify-center gap-2 px-1 ${bordered ? "border-l border-[var(--border)]" : ""}`}>
      <Icon className="h-7 w-7 text-[var(--accent)]" strokeWidth={1.75} />
      <div>
        <p className="text-[11px] font-normal text-[var(--muted)]">{label}</p>
        <p className="mt-0.5 text-[19px] leading-none">{value}</p>
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

function SupportRow({ icon: Icon, label }: { icon: typeof Heart; label: string }) {
  return (
    <div className="flex min-h-[56px] items-center gap-4 border-b border-[var(--border)] px-5 last:border-b-0">
      <Icon className="h-5 w-5 text-[var(--text)]" strokeWidth={1.7} />
      <span className="flex-1 text-[15px]">{label}</span>
      <ChevronRight className="h-5 w-5" strokeWidth={1.7} />
    </div>
  );
}

function MyPageSkeleton() {
  return <div className="space-y-5 pt-4"><div className="h-52 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" /><div className="h-56 animate-pulse rounded-[16px] bg-[var(--surface-soft)]" /></div>;
}
