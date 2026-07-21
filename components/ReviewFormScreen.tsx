"use client";

/**
 * 商品名の候補選択を含むレビュー投稿フォーム。
 *
 * 画面側では入力しやすさと早いエラー表示を担い、保存直前の最終検証と認証境界は
 * サーバーAPIへ残す。投稿確認モーダルを必ず挟み、意図しない公開を防ぐ。
 */

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Star } from "lucide-react";
import { purchaseLocations, saveReviewDraft, sceneTags } from "@/lib/nomilog-data";
import { canUseRemoteData, saveRemoteReviewDraft } from "@/lib/nomilog-remote";
import { isSupportedImageMimeType, maxSelectableImageBytes, prepareImageDataUrl } from "@/lib/image-upload-client";
import { hasSupabaseEnv } from "@/lib/supabase";
import { useNomilogProducts } from "@/components/useNomilogProducts";
import type { CarbonationLevel, Product, PurchaseLocation, SceneTag } from "@/lib/types";

const maxImageBytes = 2 * 1024 * 1024;

/**
 * 全角半角と空白だけを吸収し、候補照合時の表記ゆれを小さくする。
 * 商品名をあいまい検索の結果だけで既存商品へ紐づけると別商品を誤登録するため、意味を
 * 変えない表記差だけを吸収し、記号や語順の補正は行わない。
 */
function normalizeProductName(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();
}

/**
 * 表記ゆれだけを吸収し、商品名が完全一致した場合だけ既存商品へ紐づける。
 * 候補が0件なら未登録飲料として投稿できる仕様を守りつつ、複数候補を勝手に選んでレビューを
 * 別商品へ集計する事故を避けるため、一意一致だけを確定値として返す。
 */
function findExactProduct(name: string, catalog: Product[]) {
  const normalizedName = normalizeProductName(name);
  if (!normalizedName) return undefined;

  const matches = catalog.filter((item) => normalizeProductName(item.name) === normalizedName);
  return matches.length === 1 ? matches[0] : undefined;
}

/**
 * 入力途中の商品候補を最大5件へ絞る。
 * 完全一致を先頭へ並べることで、既存商品を選ぶ操作を短くしつつ、候補の出し過ぎを防ぐ。
 */
function findProductCandidates(name: string, catalog: Product[]) {
  const normalizedQuery = normalizeProductName(name);
  if (!normalizedQuery) return [];

  return catalog
    .filter((item) => normalizeProductName(item.name).includes(normalizedQuery))
    .sort((first, second) => {
      const firstExact = normalizeProductName(first.name) === normalizedQuery ? 1 : 0;
      const secondExact = normalizeProductName(second.name) === normalizedQuery ? 1 : 0;
      return secondExact - firstExact;
    })
    .slice(0, 5);
}

/**
 * 投稿フォームの入力状態、認証状態、確認モーダルを管理する。
 * 入力体験のための即時検証は画面で行う一方、公開直前の確認と保存はサーバー・DBの検証を
 * 通す。責務を分けることで、画面を迂回したリクエストでも投稿条件を守れるようにする。
 */
export function ReviewFormScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const catalog = useNomilogProducts();
  const productId = params.get("productId");
  const product = catalog.find((item) => item.id === productId);
  const initialDrinkName = product?.name ?? "";
  const [rating, setRating] = useState(0);
  const [drinkNameOverride, setDrinkNameOverride] = useState<string | null>(null);
  const [sweetness, setSweetness] = useState(3);
  const [carbonation, setCarbonation] = useState<CarbonationLevel>(2);
  const [costPerformance, setCostPerformance] = useState(3);
  const [scene, setScene] = useState<SceneTag[]>([]);
  const [purchaseLocation, setPurchaseLocation] = useState<PurchaseLocation | null>(null);
  const [comment, setComment] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [imageError, setImageError] = useState("");
  const [isImagePreparing, setIsImagePreparing] = useState(false);
  const [formError, setFormError] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitConfirmationOpen, setSubmitConfirmationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const remoteEnabled = hasSupabaseEnv();
  const [authStatus, setAuthStatus] = useState<"loading" | "signed-in" | "signed-out" | "unavailable">(remoteEnabled ? "loading" : "signed-in");
  const confirmationRef = useRef<HTMLDivElement>(null);
  const cancelConfirmationRef = useRef<HTMLButtonElement>(null);
  const imageReadId = useRef(0);
  // 商品マスタの取得完了を待たずにフォームを描画するため、初期名とユーザー編集値を分離する。
  // 後から商品が届いてもoverrideを優先し、入力中の飲み物名を上書きしない。
  const drinkName = drinkNameOverride ?? initialDrinkName;
  const matchedProduct = findExactProduct(drinkName, catalog);
  const productCandidates = findProductCandidates(drinkName, catalog);

  // 初期値の味指標だけでは離脱確認を出さず、ユーザーが実際に変更した項目だけをdirtyとする。
  // こうすることで、画面を開いて戻っただけの操作に不要な確認を挟まない。
  const dirty = drinkName !== initialDrinkName || rating > 0 || comment.length > 0 || scene.length > 0 || Boolean(imageDataUrl) || isImagePreparing;

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
    window.location.assign(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  }

  async function onImageChange(file?: File) {
    const readId = ++imageReadId.current;
    setImageError("");
    setImageDataUrl(undefined);
    setIsImagePreparing(false);
    if (!file) return;

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

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestSubmitConfirmation();
  }

  function requestSubmitConfirmation() {
    setFormError("");
    // DB制約と同じ必須条件を送信前に検証し、どの入力が不足しているかをフォーム下部へ表示する。
    // ここは操作性のための早期通知であり、改ざんされたリクエストを防ぐ最終境界ではない。
    if (!drinkName.trim()) return setFormError("飲み物名を入力してください。");
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
    // 全角・半角や空白を正規化して既存商品と完全一致させる。
    // 投稿元に関係なく、一意に一致した商品へ紐づけ、候補がない場合は未登録飲料として保存する。
    const resolvedProductId = findExactProduct(drinkName, catalog)?.id;
    const draft = {
      productId: resolvedProductId,
      productName: drinkName.trim(),
      rating,
      sweetness,
      carbonation,
      scene,
      costPerformance,
      purchaseLocation,
      comment: comment.trim(),
      imageDataUrl
    };

    try {
      // 環境変数がある場合はSupabaseへ保存し、未設定の開発環境では同じ形をlocalStorageへ保存する。
      if (canUseRemoteData()) await saveRemoteReviewDraft(draft);
      else saveReviewDraft(draft);

      setSubmitted(true);
      window.sessionStorage.removeItem("nomilog.reviewFormDirty");
      router.push(resolvedProductId ? `/products/${resolvedProductId}` : "/reviews");
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
        <h1 className="text-center text-[18px] leading-none">レビューを投稿</h1>
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
          <p className="text-[15px]">レビュー投稿にはログインが必要です</p>
          <p className="mt-2 text-[12px] font-normal text-[var(--muted)]">メールへ届く6桁コードで、安全にログインできます。</p>
          <button type="button" onClick={startSignIn} className="tap-target mt-4 inline-flex items-center rounded-[8px] bg-[var(--accent)] px-4 text-[13px] !text-white">
            ログインして投稿する
          </button>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="pt-5">
          <Field label="飲み物名" headingId="review-drink-name-label">
            <input
              id="review-drink-name"
              type="text"
              value={drinkName}
              role="combobox"
              onChange={(event) => {
                const nextName = event.target.value.slice(0, 80);
                setDrinkNameOverride(nextName);
                setShowProductSuggestions(Boolean(nextName.trim()));
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setShowProductSuggestions(false);
              }}
              placeholder="飲んだドリンク名を入力"
              aria-labelledby="review-drink-name-label"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-controls="drink-name-suggestions"
              aria-expanded={showProductSuggestions && productCandidates.length > 0}
              className="tap-target w-full rounded-[10px] border border-[#d9dde2] px-4 text-[16px] font-normal outline-none placeholder:text-[#a9adb3] focus:border-[var(--accent)]"
            />
            {showProductSuggestions && productCandidates.length > 0 ? (
              <div id="drink-name-suggestions" role="listbox" aria-label="商品候補" className="mt-2 overflow-hidden rounded-[10px] border border-[#d9dde2] bg-white shadow-[0_8px_20px_rgba(23,31,40,0.08)]">
                <p className="border-b border-[#eef0f2] px-3 py-2 text-[12px] text-[var(--muted)]">商品候補</p>
                <div className="divide-y divide-[#eef0f2]">
                  {productCandidates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={matchedProduct?.id === item.id}
                      onClick={() => {
                        setDrinkNameOverride(item.name);
                        setShowProductSuggestions(false);
                      }}
                      className="tap-target flex min-h-[56px] w-full items-center justify-between gap-3 px-3 text-left hover:bg-[#f5faff]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Image src={item.imageUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" />
                        <span className="min-w-0">
                          <span className="block truncate text-[14px]">{item.name}</span>
                          <span className="mt-0.5 block truncate text-[12px] text-[var(--muted)]">{item.maker}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-[var(--accent)]">選択</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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

          <Field label="写真を追加（任意）" className="pt-6">
            <label className={`tap-target flex min-h-[80px] cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-dashed border-[#b9bec5] text-[16px] text-[var(--accent)] ${isImagePreparing ? "pointer-events-none opacity-60" : ""}`}>
              <ImagePlus className="h-6 w-6" strokeWidth={1.7} /> {isImagePreparing ? "画像を準備中…" : "写真を選ぶ"}
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isImagePreparing} className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void onImageChange(file);
              }} />
            </label>
            {imageError ? <p className="mt-2 text-[12px] text-[var(--danger)]">{imageError}</p> : null}
            {imageDataUrl ? (
              // 選択したローカル画像はData URLのまま即時表示する。まだ公開URLがなく、Next Imageへ
              // 渡すと最適化サーバー経由の変換を待つため、投稿前プレビューでは通常のimgを使う。
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageDataUrl} alt="写真プレビュー" className="mt-3 h-40 w-full rounded-[10px] object-cover" />
            ) : null}
          </Field>

          {formError ? <p id="review-form-error" role="alert" className="mt-4 rounded-[8px] bg-[#fff3f3] p-3 text-[12px] text-[var(--danger)]">{formError}</p> : null}
          <button type="button" onClick={requestSubmitConfirmation} disabled={isImagePreparing} aria-describedby={formError ? "review-form-error" : undefined} className="tap-target mt-7 min-h-[54px] w-full rounded-[12px] bg-[var(--accent)] px-4 text-[18px] !text-white shadow-[0_6px_14px_rgba(42,155,225,0.18)] disabled:opacity-60">
            投稿する
          </button>
        </form>
        )}
      {submitConfirmationOpen ? (
        <div ref={confirmationRef} className="fixed inset-0 z-50 grid place-items-end bg-black/30" role="dialog" aria-modal="true" aria-busy={isSubmitting} aria-labelledby="submit-confirmation-title" aria-describedby="submit-confirmation-description">
          <section className="mx-auto w-full max-w-[460px] rounded-t-[8px] bg-white px-[18px] pt-6 pb-[calc(18px+env(safe-area-inset-bottom))]">
            <div className="mx-auto max-w-[424px]">
              <h2 id="submit-confirmation-title" className="text-center text-[17px]">レビューを投稿しますか？</h2>
              <p id="submit-confirmation-description" className="mt-2 text-center text-[13px] font-normal leading-relaxed text-[var(--muted)]">
                {matchedProduct ? `「${matchedProduct.name}」のレビューとして投稿します。投稿するとレビューが公開されます。` : "投稿するとレビューが公開されます。"}
              </p>
              {submitError ? <p role="alert" className="mt-3 rounded-[8px] bg-[#fff3f3] p-3 text-[12px] text-[var(--danger)]">{submitError}</p> : null}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button ref={cancelConfirmationRef} type="button" disabled={isSubmitting} onClick={() => setSubmitConfirmationOpen(false)} className="tap-target rounded-[8px] border border-[var(--border)] text-[14px] text-[#3d4147] disabled:cursor-not-allowed disabled:opacity-50">
                  キャンセル
                </button>
                <button type="button" disabled={isSubmitting} onClick={confirmAndSubmit} className="tap-target rounded-[8px] bg-[var(--accent)] text-[14px] !text-white disabled:cursor-wait disabled:opacity-60">
                  {isSubmitting ? "投稿中..." : "投稿する"}
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
