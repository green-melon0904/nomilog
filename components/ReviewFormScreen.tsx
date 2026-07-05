"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LoginNotice } from "@/components/LoginNotice";
import { RatingStars } from "@/components/RatingStars";
import {
  carbonationLabels,
  products,
  purchaseLocations,
  saveReviewDraft,
  sceneTags
} from "@/lib/nomilog-data";
import { canUseRemoteData, saveRemoteReviewDraft } from "@/lib/nomilog-remote";
import type { CarbonationLevel, PurchaseLocation, SceneTag } from "@/lib/types";

const maxImageBytes = 2 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];

export function ReviewFormScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get("productId");
  const product = products.find((item) => item.id === productId);
  const [rating, setRating] = useState(0);
  const [sweetness, setSweetness] = useState(3);
  const [carbonation, setCarbonation] = useState<CarbonationLevel>(2);
  const [costPerformance, setCostPerformance] = useState(3);
  const [scene, setScene] = useState<SceneTag[]>([]);
  const [purchaseLocation, setPurchaseLocation] = useState<PurchaseLocation>("セブン");
  const [comment, setComment] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [imageError, setImageError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // 途中まで入力したレビューを失わないよう、ユーザーが意味のある入力を始めた状態を
  // dirty として扱う。評価・コメント・シーン・画像のいずれかがあれば離脱確認の対象にする。
  const dirty = useMemo(
    () => rating > 0 || comment.length > 0 || scene.length > 0 || Boolean(imageDataUrl),
    [comment.length, imageDataUrl, rating, scene.length]
  );

  useEffect(() => {
    // ブラウザの戻る・リロード・タブを閉じる操作では React Router の確認が効かないため、
    // beforeunload でも未送信レビューの破棄確認を出せるようにしている。
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitted) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitted]);

  useEffect(() => {
    // ボトムナビは AppShell 側にあるため、フォームの dirty 状態を sessionStorage で共有する。
    // これにより投稿画面外のナビゲーションでも、入力内容を破棄する前に確認できる。
    window.sessionStorage.setItem("nomilog.reviewFormDirty", dirty && !submitted ? "true" : "false");
    return () => window.sessionStorage.removeItem("nomilog.reviewFormDirty");
  }, [dirty, submitted]);

  if (!product) {
    // productId がない状態で投稿画面に来た場合は、誤って別商品のレビューにならないよう保存させない。
    // MVPでは商品詳細から投稿開始する導線に寄せ、まず検索画面へ戻して商品を選ばせる。
    return (
      <div className="screen">
        <HeaderlessTitle title="レビューを書く" onClose={() => router.back()} />
        <div className="soft-card p-4">
          <p className="text-[17px] font-black">商品を選んでください</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            レビュー投稿は商品詳細から開始します。検索して、飲んだ商品を選んでください。
          </p>
          <Link
            href="/search"
            className="tap-target mt-3 inline-flex items-center rounded-[8px] bg-[var(--accent)] px-4 text-[14px] font-black text-white"
          >
            商品を検索する
          </Link>
        </div>
      </div>
    );
  }

  const selectedProduct = product;

  function toggleScene(next: SceneTag) {
    // シーンは複数選択なので、押すたびに追加・削除を切り替える。
    // DB 側でも text[] として保存するため、ここでも配列のまま状態を持つ。
    setScene((current) =>
      current.includes(next) ? current.filter((item) => item !== next) : [...current, next]
    );
  }

  async function onImageChange(file?: File) {
    setImageError("");
    setImageDataUrl(undefined);
    if (!file) return;

    // iPhoneではHEIC画像が選ばれやすいが、MVPではサーバー側変換を持たない。
    // 対応形式だけを明示的に許可して、投稿時ではなく選択直後に分かるようにする。
    if (!acceptedTypes.includes(file.type)) {
      setImageError("JPEG / PNG / WebP のみ対応しています。HEICはMVPでは非対応です。");
      return;
    }

    if (file.size > maxImageBytes) {
      setImageError("画像サイズは2MB以内にしてください。");
      return;
    }

    // ローカルモードでは画像をlocalStorageへ保存するため、プレビューと保存の両方に使える
    // Data URLへ変換する。Supabase接続時は送信時にBlobへ戻してStorageへアップロードする。
    const reader = new FileReader();
    reader.onload = () => setImageDataUrl(String(reader.result));
    reader.onerror = () => setImageError("画像の読み込みに失敗しました。もう一度選択してください。");
    reader.readAsDataURL(file);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    // DB制約と同じ必須条件を画面側でも先に確認し、送信後に失敗する体験を減らす。
    // 評価・おすすめシーン・コメントはレビューとして成立する最低限の情報として扱う。
    if (rating < 1) {
      setFormError("総合評価を選択してください。");
      return;
    }
    if (scene.length < 1) {
      setFormError("おすすめシーンを1つ以上選択してください。");
      return;
    }
    if (comment.trim().length < 1) {
      setFormError("コメントを入力してください。");
      return;
    }

    try {
      const draft = {
        productId: selectedProduct.id,
        rating,
        sweetness,
        carbonation,
        scene,
        costPerformance,
        purchaseLocation,
        comment: comment.trim(),
        imageDataUrl
      };
      // 環境変数がある場合はSupabaseへ保存し、未設定の開発環境ではlocalStorageへ保存する。
      // 同じフォームで本番想定とローカルデモの両方を動かせるよう、保存先だけをここで分岐する。
      if (canUseRemoteData()) {
        await saveRemoteReviewDraft(draft);
      } else {
        saveReviewDraft(draft);
      }
      setSubmitted(true);
      window.sessionStorage.removeItem("nomilog.reviewFormDirty");
      router.push(`/products/${selectedProduct.id}`);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "レビューの保存に失敗しました。");
    }
  }

  function closeForm() {
    // 画面左上の閉じる操作でも、ボトムナビやリロードと同じく未保存レビューを守る。
    if (dirty && !submitted && !window.confirm("入力中のレビューを破棄しますか？")) return;
    router.back();
  }

  const disabled = rating < 1 || !comment.trim() || scene.length === 0;

  return (
    <div className="screen">
      <HeaderlessTitle title="レビューを書く" onClose={closeForm} />

      <LoginNotice compact />

      <div className="app-card my-4 grid grid-cols-[72px_1fr] gap-3 overflow-hidden p-2">
        <div className="relative h-[84px] overflow-hidden rounded-[8px] bg-[var(--surface-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-full w-full object-contain" />
        </div>
        <div className="py-1">
          <p className="text-[12px] font-bold text-[var(--muted)]">商品</p>
          <p className="mt-1 text-[17px] font-black leading-snug">{selectedProduct.name}</p>
          <p className="mt-1 text-[12px] font-bold text-[var(--muted)]">{selectedProduct.maker}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="総合評価">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setRating(index + 1)}
                  className="tap-target w-10 rounded-[8px] text-[28px] leading-none text-[var(--amber)] transition hover:bg-[var(--accent-soft)]"
                  aria-label={`${index + 1}点`}
                >
                  {index < rating ? "★" : "☆"}
                </button>
              ))}
            </div>
            {rating > 0 ? <RatingStars value={rating} /> : null}
          </div>
        </Field>

        <Field label="甘さ">
          <NumberButtons value={sweetness} onChange={setSweetness} />
        </Field>

        <Field label="炭酸の強さ">
          <ChoiceGrid
            values={Object.entries(carbonationLabels)}
            active={String(carbonation)}
            onChange={(value) => setCarbonation(Number(value) as CarbonationLevel)}
          />
        </Field>

        <Field label="コスパ">
          <NumberButtons value={costPerformance} onChange={setCostPerformance} />
        </Field>

        <Field label="おすすめシーン">
          <div className="flex flex-wrap gap-2">
            {sceneTags.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => toggleScene(item)}
                className={`tap-target rounded-[8px] border px-4 text-[14px] font-black ${
                  scene.includes(item)
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm"
                    : "border-[var(--border)] bg-white text-[var(--text)]"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </Field>

        <Field label="購入場所">
          <ChoiceGrid
            values={purchaseLocations.map((item) => [item, item])}
            active={purchaseLocation}
            onChange={(value) => setPurchaseLocation(value as PurchaseLocation)}
          />
        </Field>

        <Field label="コメント">
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value.slice(0, 300))}
            rows={4}
            placeholder="味・買った場所・飲みたいシーンをメモ"
            aria-invalid={!comment.trim()}
            className="w-full resize-none rounded-[8px] border border-[var(--border)] bg-white p-3 text-[16px] font-semibold leading-relaxed outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <p className="mt-1 text-right text-[12px] font-bold text-[var(--muted)]">{comment.length}/300</p>
        </Field>

        <Field label="写真（任意）">
          <label className="tap-target flex cursor-pointer items-center justify-center rounded-[8px] border border-dashed border-[var(--accent)] bg-[var(--accent-soft)] px-4 text-[14px] font-black text-[var(--accent-strong)]">
            写真を追加
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => onImageChange(event.target.files?.[0])}
            />
          </label>
          {imageError ? <p className="mt-2 text-[13px] font-bold text-[var(--cola)]">{imageError}</p> : null}
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageDataUrl} alt="写真プレビュー" className="mt-3 h-40 w-full rounded-[8px] object-cover" />
          ) : null}
        </Field>

        <div className="sticky bottom-[calc(86px+env(safe-area-inset-bottom))] z-10 space-y-2">
          {formError ? (
            <p id="review-form-error" role="alert" className="rounded-[8px] border border-[#f2c7c7] bg-[#fff5f5] p-3 text-[13px] font-bold text-[var(--cola)]">
              {formError}
            </p>
          ) : null}
          <button
            aria-describedby={formError ? "review-form-error" : undefined}
            className="tap-target w-full rounded-[8px] bg-[var(--accent)] px-4 text-[16px] font-black text-white shadow-[0_12px_24px_rgba(42,155,225,0.22)] disabled:bg-[#b9d9ef]"
          >
            {disabled ? "未入力項目があります" : "投稿する"}
          </button>
        </div>
      </form>
    </div>
  );
}

function HeaderlessTitle({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mb-4 flex h-12 items-center justify-between">
      <button onClick={onClose} className="tap-target grid w-11 place-items-center rounded-[8px] bg-[var(--accent-soft)] text-[24px] font-black text-[var(--accent-strong)]" aria-label="閉じる">
        ×
      </button>
      <h1 className="text-[20px] font-black">{title}</h1>
      <span className="w-11" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="app-card p-4">
      <h2 className="mb-3 text-[16px] font-black">{label}</h2>
      {children}
    </section>
  );
}

function NumberButtons({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: 5 }).map((_, index) => {
        const next = index + 1;
        return (
          <button
            type="button"
            key={next}
            onClick={() => onChange(next)}
            className={`tap-target rounded-[8px] border text-[15px] font-black ${
              value === next ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-white text-[var(--text)]"
            }`}
          >
            {next}
          </button>
        );
      })}
    </div>
  );
}

function ChoiceGrid({
  values,
  active,
  onChange
}: {
  values: string[][];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map(([value, label]) => (
        <button
          type="button"
          key={value}
          onClick={() => onChange(value)}
          className={`tap-target rounded-[8px] border px-4 text-[14px] font-black ${
            active === value ? "border-[var(--accent)] bg-[var(--accent)] text-white shadow-sm" : "border-[var(--border)] bg-white text-[var(--text)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
