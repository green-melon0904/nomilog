import { AppShell } from "@/components/AppShell";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { legalEstablishedAt, legalUpdatedAt, publicContactEmail, publicOperatorName } from "@/lib/legal";

const sections = [
  { heading: "1. 取得する情報", paragraphs: ["のみログは、サービス提供に必要な範囲で次の情報を取得します。"], items: ["メールアドレス、表示名、プロフィール画像などのアカウント情報", "レビュー、評価、写真、いいね、お気に入り、通報、問い合わせ内容", "アクセス日時、ブラウザ情報、IPアドレスなどのセキュリティ・障害調査情報"] },
  { heading: "2. 利用目的", paragraphs: ["取得した情報は、アカウント認証、レビュー表示、通知、問い合わせ対応、不正利用防止、サービス改善、法令上必要な対応のために利用します。"] },
  { heading: "3. 外部サービス", paragraphs: ["認証にはWorkOS、データベースと画像保存にはSupabase、Webフォントの配信にはGoogle Fontsを利用します。各サービス事業者は、サービス提供、セキュリティ確保、障害調査に必要な範囲で情報を取り扱います。新しい外部サービスを追加する場合は、利用開始前に本方針を更新します。"] },
  { heading: "4. 公開される情報", paragraphs: ["表示名、プロフィール画像、レビュー内容、評価、レビュー写真、投稿日、いいね件数は、サービス上で他の利用者へ公開されます。メールアドレス、通知、個人のお気に入り一覧は公開しません。"] },
  { heading: "5. 保存期間と削除", paragraphs: ["プロフィール、レビュー、画像、いいね、お気に入り、通知設定は、利用者が個別に削除するか、アカウントを削除するまで保存します。アカウント削除時は、のみログが管理する稼働中のデータベースと画像保存領域から本人データを削除します。", "通報は対応完了から、問い合わせ内容と返信先は最終対応から、原則として1年間保存します。1年を経過した情報は運営者が定期的に確認して削除します。不正利用や法令上の対応が継続している場合は、その対応に必要な期間に限り延長することがあります。外部サービスのバックアップやセキュリティログは、各事業者の設定や規約に定める保持期間に従います。"] },
  { heading: "6. 安全管理", paragraphs: ["通信の暗号化、認証Cookieの保護、データベースの行レベル権限、入力検証などを用いて、不正アクセス、漏えい、改ざんの防止に努めます。"] },
  { heading: "7. 利用者の選択と請求手続", paragraphs: ["マイページから通知設定の変更、プロフィール編集、投稿の削除、アカウント削除ができます。保有個人データの利用目的の通知、開示、訂正、追加、削除、利用停止などを希望する場合は、お問い合わせフォームまたは公開用メールアドレスへご連絡ください。本人以外への情報開示を防ぐため、必要な範囲で本人確認を行った後、法令に従って遅滞なく対応します。"] },
  { heading: "8. 個人運営者に関する情報", paragraphs: ["のみログは個人が運営しています。運営者本人の安全とプライバシーを守るため、氏名と住所はWeb上へ常時掲載していません。法令上、本人が知り得る状態に置くことが必要な運営者情報について請求があった場合は、公開用メールアドレスで受け付け、合理的な本人確認後に遅滞なく回答します。"] },
  { heading: "9. 方針の変更", paragraphs: ["本方針を変更する場合は、重要性に応じてサービス内でお知らせし、最終更新日を改めます。"] }
];

export default function PrivacyPage() {
  return (
    <AppShell>
      <LegalDocumentPage
        title="プライバシーポリシー"
        intro="のみログは、利用者の情報を必要な範囲に限定し、安全に取り扱います。"
        metadata={{ establishedAt: legalEstablishedAt, updatedAt: legalUpdatedAt, operatorName: publicOperatorName, contactEmail: publicContactEmail }}
        sections={sections}
      />
    </AppShell>
  );
}
