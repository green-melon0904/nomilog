/**
 * アプリ全体のメタデータ、フォント、iPhoneのsafe-area設定を定義するルートレイアウト。
 * 各ページでviewportや言語設定を個別に持つとiOSの表示条件が揺れるため、ブラウザが最初に
 * 受け取る共通設定をここへ集約する。
 */
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "のみログ",
  description: "自販機・コンビニ飲料のレビューと次の一本を見つけるモバイルWebアプリ"
};

// iPhone Safariのホームインジケータと本文を重ねないためsafe-areaを有効にする。
// maximumScaleを固定しないことで、視力に合わせたユーザーのピンチズームは妨げない。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
