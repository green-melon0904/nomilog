import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "のみログ",
  description: "自販機・コンビニ飲料のレビューと次の一本を見つけるモバイルWebアプリ"
};

// iPhone Safariで画面端まで自然に使えるよう、safe-areaを有効にする。
// maximumScaleは指定せず、ユーザーのピンチズームを妨げない設定にしている。
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
