"use client";

/**
 * 運営カタログから商品を選ぶレビュー投稿フォーム。
 *
 * 画面側では入力しやすさと早いエラー表示を担い、保存直前の最終検証と認証境界は
 * サーバーAPIへ残す。投稿確認モーダルを必ず挟み、意図しない公開を防ぐ。
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Star, Trash2 } from "lucide-react";
import { purchaseLocations, readLocalReviews, saveReviewDraft, sceneTags, updateLocalReview } from "@/lib/nomilog-data";
import { canUseRemoteData, saveRemoteReviewDraft, updateRemoteReviewDraft } from "@/lib/nomilog-remote";
import { isSupportedImageMimeType, maxSelectableImageBytes, prepareImageDataUrl } from "@/lib/image-upload-client";
import { hasSupabaseEnv } from "@/lib/supabase";
import { useNomilogProducts } from "@/components/useNomilogProducts";
import type { CarbonationLevel, PurchaseLocation, ReviewDraft, SceneTag } from "@/lib/types";

const maxImageBytes = 2 * 1024 * 1024;

type EditableReview = {
  id: string;
  productId: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  scene: SceneTag[];
  costPerformance: number;
  purchaseLocation: PurchaseLocation;
  comment: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt?: string;
};

/**
 * 投稿フォームの入力状態、認証状態、確認モーダルを管理する。
 * 入力体験のための即時検証は画面で行う一方、公開直前の確認と保存はサーバー・DBの検証を
 * 通す。責務を分けることで、画面を迂回したリクエストでも投稿条件を守れるようにする。
 */
export function ReviewFormScreen({ reviewId }: { reviewId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const catalog = useNomilogProducts();
  const initialProductId = params.get("productId") ?? "";
  const [rating, setRating] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [sweetness, setSweetness] = useState(3);
  const [carbonation, setCarbonation] = useState<CarbonationLevel>(2);
  const [costPerformance, setCostPerformance] = useState(3);
  const [scene, setScene] = useState<SceneTag[]>([]);
  const [purchaseLocation, setPurchaseLocation] = useState<PurchaseLocation | null>(null);
  const [comment, setComment] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [existingImageUrl, setExistingImageUrl] = useState<string | undefined>();
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [isImagePreparing, setIsImagePreparing] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitConfirmationOpen, setSubmitConfirmationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [editStatus, setEditStatus] = useState<"loading" | "ready" | "error">(reviewId ? "loading" : "ready");
  const [editLoadError, setEditLoadError] = useState("");
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState("");
  const [initialSnapshot, setInitialSnapshot] = useState(() => reviewId ? "" : createFormSnapshot({
    productId: initialProductId,
    rating: 0,
    sweetness: 3,
    carbonation: 2,
    costPerformance: 3,
    scene: [],
    purchaseLocation: null,
    comment: "",
    existingImageUrl: undefined,
    imageDataUrl: undefined,
    removeImage: false
  }));
  const remoteEnabled = hasSupabaseEnv();
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-in" | "signed-out" | "unavailable">(remoteEnabled ? "loading" : "signed-in");
  const confirmationRef = useRef<HTMLDivElement>(null);
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null);
  const imageReadId = useRef(0);
  // 商品詳細から来た場合だけクエリの商品を初期選択する。中央の投稿導線は空のまま始め、
  // 仮運用カタログにない飲み物を自由入力で投稿できないよう選択値だけを保存する。
  const selectedProduct = catalog.find((item) => item.id === selectedProductId);
  // URLを直接編集して存在しないproductIdを渡されても、selectの値を空へ戻す。
  // 画面表示と送信前検証の前提をそろえ、存在しない候補が選ばれたように見える状態を防ぐ。
  const selectedProductValue = selectedProduct?.id ?? "";

  const currentSnapshot = createFormSnapshot({
    productId: selectedProductId,
    rating,
    sweetness,
    carbonation,
    costPerformance,
    scene,
    purchaseLocation,
    comment,
    existingImageUrl,
    imageDataUrl,
    removeImage
  });
  // 投稿と編集のどちらも、画面を開いた時点の値と現在値を比較する。編集フォームの既存評価を
  // 「入力中」と誤判定せず、実際に一項目でも変更した場合だけ離脱確認を出す。
  const dirty = Boolean(initialSnapshot) && currentSnapshot !== initialSnapshot || isImagePreparing;

  useEffect(() => {
    // リロードやタブ閉じではAppShellの確認処理を通らないため、ブラウザ標準の離脱確認も有効にする。
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty || submitted) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitted]);

  useEffect(() => {
    if (!remoteEnabled) return;
    let active = true;
    // WorkOSの暗号化Cookieはクライアントから読めないため、表示に必要なログイン状態だけをサーバーへ問い合わせる。
    // セッションの実体やアクセストークンをブラウザ状態へ保存しないことが認証境界になる。
    void fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => ({ response, data: await response.json() as { configured?: boolean; user?: unknown } }))
      .then(({ data }) => {
        if (!active) return;
        setAuthStatus(data.configured ? (data.user ? "signed-in" : "signed-out") : "unavailable");
      })
      .catch(() => {
        if (active) setAuthStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, [remoteEnabled]);

  useEffect(() => {
    if (!reviewId) return;
    if (remoteEnabled && authStatus !== "signed-in") return;
    let active = true;

    function applyReview(review: EditableReview) {
      if (!active) return;
      setSelectedProductId(review.productId);
      setRating(review.rating);
      setSweetness(review.sweetness);
      setCarbonation(review.carbonation);
      setCostPerformance(review.costPerformance);
      setScene(review.scene);
      setPurchaseLocation(review.purchaseLocation);
      setComment(review.comment);
      setExistingImageUrl(review.imageUrl);
      setImageDataUrl(undefined);
      setRemoveImage(false);
      setExpectedUpdatedAt(review.updatedAt ?? review.createdAt);
      setInitialSnapshot(createFormSnapshot({
        productId: review.productId,
        rating: review.rating,
        sweetness: review.sweetness,
        carbonation: review.carbonation,
        costPerformance: review.costPerformance,
        scene: review.scene,
        purchaseLocation: review.purchaseLocation,
        comment: review.comment,
        existingImageUrl: review.imageUrl,
        imageDataUrl: undefined,
        removeImage: false
      }));
      setEditStatus("ready");
    }

    if (!remoteEnabled) {
      const localReview = readLocalReviews().find((review) => review.id === reviewId && review.userId === "demo-user");
      // localStorageの読込結果も次フレームでフォームへ反映し、Effect直後の連続再描画を避ける。
      const applyFrame = window.requestAnimationFrame(() => {
        if (localReview) {
          applyReview(localReview);
        } else if (active) {
          setEditLoadError("編集できるレビューが見つかりません。");
          setEditStatus("error");
        }
      });
      return () => {
        active = false;
        window.cancelAnimationFrame(applyFrame);
      };
    }

    void fetch(`/api/reviews?reviewId=${encodeURIComponent(reviewId)}`, { cache: "no-store" })
      .then(async (response) => ({
        response,
        data: await response.json().catch(() => null) as { review?: EditableReview; error?: string } | null
      }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok || !data?.review) {
          setEditLoadError(data?.error ?? "レビューを読み込めませんでした。");
          setEditStatus("error");
          return;
        }
        applyReview(data.review);
      })
      .catch(() => {
        if (!active) return;
        setEditLoadError("レビューを読み込めませんでした。");
        setEditStatus("error");
      });

    return () => {
      active = false;
    };
  }, [authStatus, remoteEnabled, reviewId]);

  useEffect(() => {
    if (!submitConfirmationOpen) return;
    const confirmation = confirmationRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;

    // モーダル中に背面のフォームが変更されると、確認文と保存内容がずれる可能性がある。
    // スクロール・フォーカス・Escapeをここで管理し、確認が終わるまで操作対象をモーダルへ閉じ込める。
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => cancelConfirmationRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        setSubmitConfirmationOpen(false);
        return;
      }
      if (event.key !== "Tab" || !confirmation) return;
      const buttons = Array.from(confirmation.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
      if (buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isSubmitting, submitConfirmationOpen]);

  useEffect(() => {
    // AppShellとは別ツリーで動くため、未保存フラグだけをsessionStorageで共有する。
    window.sessionStorage.setItem("nomilog.reviewFormDirty", dirty && !submitted ? "true" : "false");
    return () => window.sessionStorage.removeItem("nomilog.reviewFormDirty");
  }, [dirty, submitted]);

  function toggleScene(next: SceneTag) {
    // シーンは複数選択なので、再タップで解除できるトグルとして扱う。
    // 配列のまま保持し、Supabaseのtext[]と同じ形で投稿APIへ渡す。
    setScene((current) => current.includes(next) ? current.filter((item) => item !== next) : [...current, next]);
  }

  function goBack() {
    if (dirty && !window.confirm("入力中のレビューを破棄して戻りますか？")) return;
    router.back();
  }

  function startSignIn() {
    // 商品詳細から来たproductIdも含めて投稿画面へ戻す。ただし入口側で安全なアプリ内パスへ
    // 正規化するため、ここで任意の外部URLをreturnToとして成立させることはできない。
    const query = params.toString();
    const returnTo = `${pathname}${query ? `?${query}` : ""}`;
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- WorkOSへ一度だけ遷移させ、PKCE Cookieの重複生成を防ぐ。
    window.location.assign(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }

  async function onImageChange(file?: File) {
    const readId = ++imageReadId.current;
    setImageError("");
    setIsImagePreparing(false);
    if (!file) return;

    setImageDataUrl(undefined);
    setRemoveImage(false);

    // iPhoneで選ばれやすいHEICはMVPの変換対象外なので、対応形式を選択直後に検証する。
    if (!isSupportedImageMimeType(file.type)) {
      setImageError("JPEG / PNG / WebP のみ対応しています。HEICはMVPでは非対応です。");
      return;
    }
    if (file.size > maxSelectableImageBytes) {
      setImageError("画像は50MB以下を選んでください。");
      return;
    }

    setIsImagePreparing(true);
    try {
      // 端末内で縮小したData URLをローカルプレビューと保存に共用し、24MP/48MP写真も2MBのAPI境界へ収める。
      const dataUrl = await prepareImageDataUrl(file, maxImageBytes);
      if (readId !== imageReadId.current) return;
      setImageDataUrl(dataUrl);
      setImageError("");
    } catch (error) {
      if (readId !== imageReadId.current) return;
      setImageError(error instanceof Error ? error.message : "画像の読み込みに失敗しました。もう一度選択してください。");
    } finally {
      if (readId === imageReadId.current) setIsImagePreparing(false);
    }
  }

  function removeCurrentImage() {
    // 読み込み中の画像が後から復活しないよう世代を進め、編集時は既存URLを直接消さず
    // 保存要求へremoveImageを含める。キャンセルすればDB・Storageには何も変更されない。
    imageReadId.current += 1;
    setIsImagePreparing(false);
    setImageDataUrl(undefined);
    setRemoveImage(true);
    setImageError("");
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestSubmitConfirmation();
  }

  function requestSubmitConfirmation() {
    setFormError("");
    // DB制約と同じ必須条件を送信前に検証し、どの入力が不足しているかをフォーム下部へ表示する。
    // ここは操作性のための早期通知であり、改ざんされたリクエストを防ぐ最終境界ではない。
    if (!selectedProduct) return setFormError("カタログから飲み物を選択してください。");
    if (isImagePreparing) return setFormError("画像の準備が終わるまでお待ちください。");
    if (rating < 1) return setFormError("総合評価を選択してください。");
    if (scene.length < 1) return setFormError("シーンを1つ以上選択してください。");
    if (!purchaseLocation) return setFormError("購入場所を選択してください。");
    if (comment.trim().length < 1) return setFormError("コメントを入力してください。");

    // 必須項目を通過した内容だけ確認モーダルへ進め、意図しない投稿を防ぐ。
    setSubmitError("");
    setSubmitConfirmationOpen(true);
  }

  async function confirmAndSubmit() {
    // 確定ボタンを連打しても同じレビューを複数保存しないよう、保存完了まで一度だけ処理を通す。
    if (isSubmitting) return;
    // 確認ダイアログを開いた後でも状態は変わり得るため、保存直前にも必須の購入場所を確定する。
    // これにより画面上の未選択状態を許容しつつ、保存データにはnullを混ぜない。
    if (!purchaseLocation) {
      setFormError("購入場所を選択してください。");
      setSubmitError("購入場所を選択してください。");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    if (!selectedProduct) {
      setFormError("カタログから飲み物を選択してください。");
      setSubmitError("カタログから飲み物を選択してください。");
      setIsSubmitting(false);
      return;
    }

    // 商品名は自由入力を使わず選択済みのカタログから確定し、商品IDと表示名の不整合を作らない。
    const draft: ReviewDraft = {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      rating,
      sweetness,
      carbonation,
      scene,
      costPerformance,
      purchaseLocation,
      comment: comment.trim(),
      imageDataUrl,
      removeImage
    };

    try {
      // 編集時も保存先の分岐をデータ層へ閉じ込め、画面は同じReviewDraftを扱う。本人判定は
      // リモートではRoute HandlerとRLS、ローカル確認ではdemo-userの保存行に限定して行う。
      if (reviewId) {
        if (!expectedUpdatedAt) throw new Error("レビューの更新情報を確認できません。画面を開き直してください。");
        if (canUseRemoteData()) await updateRemoteReviewDraft(reviewId, draft, expectedUpdatedAt);
        else updateLocalReview(reviewId, draft, expectedUpdatedAt);
      } else if (canUseRemoteData()) {
        await saveRemoteReviewDraft(draft);
      } else {
        saveReviewDraft(draft);
      }

      setSubmitted(true);
      window.sessionStorage.removeItem("nomilog.reviewFormDirty");
      router.push(`/products/${selectedProduct.id}`);
    } catch (error) {
      // 保存に失敗した場合は確認モーダルを閉じず、入力を保ったまま再試行またはキャンセルを選べるようにする。
      const message = error instanceof Error ? error.message : "レビューの保存に失敗しました。";
      setFormError(message);
      setSubmitError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="screen review-form-screen pb-[calc(28px+env(safe-area-inset-bottom))]">
      <header className="sticky top-0 z-20 -mx-5 grid h-[68px] grid-cols-[56px_1fr_56px] items-center border-b border-[var(--border)] bg-white/95 px-2 backdrop-blur-md">
        <button type="button" onClick={goBack} aria-label="前の画面へ戻る" className="tap-target grid place-items-center">
          <ArrowLeft className="h-7 w-7" strokeWidth={1.7} />
        </button>
        <h1 className="text-center text-[18px] leading-none">{reviewId ? "レビューを編集" : "レビューを投稿"}</h1>
        {/* プレビューを置かない代わりに余白を確保し、タイトルだけは画面の中央に揃える。 */}
        <span aria-hidden="true" />
      </header>

      {remoteEnabled && authStatus === "loading" ? (
        <div className="py-8 text-center text-[13px] text-[var(--muted)]">ログイン状態を確認しています。</div>
      ) : remoteEnabled && authStatus === "unavailable" ? (
        <section className="border-b border-[var(--border)] py-8 text-center">
          <p className="text-[15px]">ログイン機能を準備中です</p>
          <p className="mt-2 text-[12px] font-normal text-[var(--muted)]">WorkOSの設定が完了すると、メール認証で投稿できます。</p>
        </section>
      ) : remoteEnabled && authStatus === "signed-out" ? (
        <section className="border-b border-[var(--border)] py-8 text-center">
          <p className="text-[15px]">レビュー{reviewId ? "編集" : "投稿"}にはログインが必要です</p>
          <p className="mt-2 text-[12px] font-normal text-[var(--muted)]">メールへ届く6桁コードで、安全にログインできます。</p>
          <button type="button" onClick={startSignIn} className="tap-target mt-4 inline-flex items-center rounded-[8px] bg-[var(--accent)] px-4 text-[13px] !text-white">
            ログインして{reviewId ? "編集する" : "投稿する"}
          </button>
        </section>
      ) : reviewId && editStatus === "loading" ? (
        <div className="py-10 text-center text-[13px] text-[var(--muted)]">レビューを読み込んでいます。</div>
      ) : reviewId && editStatus === "error" ? (
        <section className="py-10 text-center">
          <p role="alert" className="text-[14px] text-[var(--danger)]">{editLoadError}</p>
          <button type="button" onClick={goBack} className="tap-target mt-5 rounded-[8px] border border-[var(--accent)] px-5 text-[13px] text-[var(--accent)]">前の画面へ戻る</button>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="pt-5">
          <Field label="飲み物" headingId="review-product-label">
            <select
              id="review-product"
              value={selectedProductValue}
              onChange={(event) => setSelectedProductId(event.target.value)}
              aria-labelledby="review-product-label"
              className="tap-target w-full rounded-[10px] border border-[#d9dde2] bg-white px-4 text-[16px] font-normal outline-none focus:border-[var(--accent)]"
            >
              <option value="">カタログから選択</option>
              {catalog.map((item) => <option key={item.id} value={item.id}>{item.name} - {item.maker}</option>)}
            </select>
          </Field>

          <section className="mt-6 border-b border-[var(--border)] pb-4">
            <div className="grid grid-cols-[96px_1fr_38px] items-center gap-2">
              <h2 className="text-[17px]">総合評価</h2>
              <div className="flex justify-between">
                {Array.from({ length: 5 }).map((_, index) => {
                  const score = index + 1;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setRating(score)}
                      className="tap-target grid w-10 place-items-center"
                      aria-label={`${score}点`}
                      aria-pressed={score === rating}
                    >
                      <Star
                        className={score <= rating ? "h-9 w-9 fill-[var(--accent)] text-[var(--accent)]" : "h-9 w-9 fill-white text-[#aeb3ba]"}
                        strokeWidth={1.5}
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-right text-[17px]">{rating > 0 ? `${rating}.0` : "-"}</span>
            </div>
          </section>

          <div className="space-y-2 py-4">
            <MetricRow label="甘さ" value={sweetness} onChange={setSweetness} startLabel="控えめ" endLabel="甘い" />
            <MetricRow label="炭酸" value={carbonation + 1} onChange={(value) => setCarbonation((value - 1) as CarbonationLevel)} startLabel="弱い" endLabel="強い" />
            <MetricRow label="コスパ" value={costPerformance} onChange={setCostPerformance} startLabel="悪い" endLabel="良い" />
          </div>

          <Field label="シーン" className="pt-4">
            <div className="grid grid-cols-3 gap-3">
              {sceneTags.map((item) => (
                <ChoiceButton key={item} active={scene.includes(item)} onClick={() => toggleScene(item)}>{item}</ChoiceButton>
              ))}
            </div>
          </Field>

          <Field label="購入場所" className="pt-7">
            <div className="purchase-location-grid grid gap-3">
              {purchaseLocations.map((item) => (
                <ChoiceButton key={item} active={purchaseLocation === item} onClick={() => setPurchaseLocation(item)}>
                  {item}
                </ChoiceButton>
              ))}
            </div>
          </Field>

          <Field label="コメント" headingId="review-comment-label" className="pt-7">
            <div className="relative">
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value.slice(0, 300))}
                rows={3}
                placeholder="感想を自由に書いてみましょう！"
                aria-labelledby="review-comment-label"
                className="min-h-[116px] w-full resize-none rounded-[10px] border border-[#d9dde2] p-4 pb-8 text-[16px] font-normal leading-relaxed outline-none placeholder:text-[#a9adb3] focus:border-[var(--accent)]"
              />
              <span className="absolute bottom-3 right-3 text-[12px] text-[var(--muted)]">{comment.length}/300</span>
            </div>
          </Field>

          <Field label={reviewId ? "写真を変更（任意）" : "写真を追加（任意）"} className="pt-6">
            <label className={`tap-target flex min-h-[80px] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#b9bec5] text-[16px] text-[var(--accent)] ${isImagePreparing ? "pointer-events-none opacity-60" : ""}`}>
              <ImagePlus className="h-6 w-6" strokeWidth={1.7} /> {isImagePreparing ? "画像を準備中…" : "写真を選ぶ"}
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isImagePreparing} className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onImageChange(file);
              }} />
            </label>
            {imageError ? <p className="mt-2 text-[12px] text-[var(--danger)]">{imageError}</p> : null}
            {imageDataUrl || (existingImageUrl && !removeImage) ? (
              <div className="relative mt-3">
                {/* Data URLと既存Storage URLを同じプレビューへ表示し、保存前に削除対象も確認できるようにする。 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageDataUrl ?? existingImageUrl} alt="レビュー写真のプレビュー" className="h-40 w-full rounded-[10px] object-cover" />
                <button type="button" onClick={removeCurrentImage} className="tap-target absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-3 text-[12px] text-[var(--danger)] shadow-sm">
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />写真を削除
                </button>
              </div>
            ) : null}
          </Field>

          {formError ? <p id="review-form-error" role="alert" className="mt-4 rounded-[8px] bg-[#fff3f3] p-3 text-[12px] text-[var(--danger)]">{formError}</p> : null}
          <button type="button" onClick={requestSubmitConfirmation} disabled={isImagePreparing} aria-describedby={formError ? "review-form-error" : undefined} className="tap-target mt-7 min-h-[54px] w-full rounded-[12px] bg-[var(--accent)] px-4 text-[18px] !text-white shadow-[0_6px_14px_rgba(42,155,225,0.18)] disabled:opacity-60">
            {reviewId ? "変更を保存" : "投稿する"}
          </button>
        </form>
        )}
      {submitConfirmationOpen ? (
        <div ref={confirmationRef} className="fixed inset-0 z-50 grid place-items-end bg-black/30" role="dialog" aria-modal="true" aria-busy={isSubmitting} aria-labelledby="submit-confirmation-title" aria-describedby="submit-confirmation-description">
          <section className="mx-auto w-full max-w-[460px] rounded-t-[8px] bg-white px-[18px] pt-6 pb-[calc(18px+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-[424px]">
              <h2 id="submit-confirmation-title" className="text-center text-[17px]">レビューを{reviewId ? "更新" : "投稿"}しますか？</h2>
              <p id="submit-confirmation-description" className="mt-2 text-center text-[13px] font-normal leading-relaxed text-[var(--muted)]">
                {selectedProduct
                  ? `「${selectedProduct.name}」のレビューとして${reviewId ? "更新" : "投稿"}します。内容は公開されます。`
                  : `内容を${reviewId ? "更新" : "投稿"}するとレビューが公開されます。`}
              </p>
              {submitError ? <p role="alert" className="mt-3 rounded-[8px] bg-[#fff3f3] p-3 text-[12px] text-[var(--danger)]">{submitError}</p> : null}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button ref={cancelConfirmationRef} type="button" disabled={isSubmitting} onClick={() => setSubmitConfirmationOpen(false)} className="tap-target rounded-[8px] border border-[var(--border)] text-[14px] text-[#3d4147] disabled:cursor-not-allowed disabled:opacity-50">
                  キャンセル
                </button>
                <button type="button" disabled={isSubmitting} onClick={confirmAndSubmit} className="tap-target rounded-[8px] bg-[var(--accent)] text-[14px] !text-white disabled:cursor-wait disabled:opacity-60">
                  {isSubmitting ? (reviewId ? "更新中..." : "投稿中...") : (reviewId ? "更新する" : "投稿する")}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children, className = "", headingId }: { label: string; children: React.ReactNode; className?: string; headingId?: string }) {
  return (
    <section className={className}>
      <h2 id={headingId} className="mb-3 text-[17px]">{label}</h2>
      {children}
    </section>
  );
}

function MetricRow({ label, value, onChange, startLabel, endLabel }: { label: string; value: number; onChange: (value: number) => void; startLabel: string; endLabel: string }) {
  return (
    <div className="grid grid-cols-[62px_1fr] items-center gap-3">
      <p className="text-[17px]">{label}</p>
      <AttributeScale label={label} value={value} onChange={onChange} startLabel={startLabel} endLabel={endLabel} />
    </div>
  );
}

function AttributeScale({ label, value, onChange, startLabel, endLabel }: { label: string; value: number; onChange: (value: number) => void; startLabel: string; endLabel: string }) {
  return (
    <div className="grid grid-cols-[46px_1fr_34px] items-center gap-2">
      <span className="text-[12px] text-[var(--muted)]">{startLabel}</span>
      <div className="grid grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => {
          const score = index + 1;
          return (
            <button key={score} type="button" onClick={() => onChange(score)} aria-label={`${label} ${score}段階`} aria-pressed={score === value} className="tap-target grid place-items-center">
              <span className={`h-[22px] w-[22px] rounded-full border ${score === value ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_1px_2px_rgba(42,155,225,0.24)]" : "border-[#b9bec5] bg-white"}`} />
            </button>
          );
        })}
      </div>
      <span className="text-right text-[12px] text-[var(--muted)]">{endLabel}</span>
    </div>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`tap-target whitespace-nowrap rounded-[10px] border px-1 text-[12px] leading-tight ${active ? "border-[var(--accent)] bg-[var(--accent)] !text-white shadow-sm" : "border-[#8abfff] bg-white text-[var(--accent)]"}`}>
      {children}
    </button>
  );
}

/**
 * フォームの意味のある保存値だけを安定した文字列へ変換し、初期状態との比較に使う。
 * 画面制御用のエラーやモーダル状態は含めず、同じシーン集合は選択順に左右されないよう並べ替える。
 */
function createFormSnapshot(values: {
  productId: string;
  rating: number;
  sweetness: number;
  carbonation: CarbonationLevel;
  costPerformance: number;
  scene: SceneTag[];
  purchaseLocation: PurchaseLocation | null;
  comment: string;
  existingImageUrl?: string;
  imageDataUrl?: string;
  removeImage: boolean;
}) {
  return JSON.stringify({ ...values, scene: [...values.scene].sort() });
}
