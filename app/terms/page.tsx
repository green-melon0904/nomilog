import { AppShell } from "@/components/AppShell";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { legalEstablishedAt, legalUpdatedAt, publicContactEmail, publicOperatorName } from "@/lib/legal";

const sections = [
  { heading: "1. サービスの内容", paragraphs: ["のみログは、飲料の商品情報やレビューを閲覧・投稿できるサービスです。掲載情報は参考情報であり、商品の品質、安全性、販売状況を保証するものではありません。"] },
  { heading: "2. アカウント", paragraphs: ["レビュー投稿、いいね、お気に入りなど一部の機能にはアカウント登録が必要です。利用者は自分のアカウントを適切に管理し、第三者に利用させないものとします。"] },
  { heading: "3. 投稿内容", paragraphs: ["利用者は、自らが権利を有する内容のみを投稿してください。投稿されたレビューは、のみログ内で表示、編集、配信するために必要な範囲で利用します。"], items: ["虚偽、なりすまし、スパム、広告を目的とする投稿", "他者への嫌がらせ、差別、脅迫を含む投稿", "著作権、商標権、プライバシーその他の権利を侵害する投稿", "法令または公序良俗に反する投稿"] },
  { heading: "4. 通報と非公開化", paragraphs: ["運営は、通報の有無にかかわらず、本規約に違反するおそれがあるレビューを確認し、必要に応じて非公開化または削除できます。判断理由の個別開示をお約束するものではありません。"] },
  { heading: "5. サービスの変更・停止", paragraphs: ["保守、障害、運営上の都合により、事前の通知なくサービスの全部または一部を変更・停止することがあります。"] },
  { heading: "6. 免責", paragraphs: ["運営は、故意または重大な過失がある場合を除き、本サービスの利用によって生じた損害について、法令で認められる範囲で責任を負いません。"] },
  { heading: "7. 規約の変更", paragraphs: ["内容を変更する場合は、重要性に応じてサービス内でお知らせします。変更後も利用を継続した場合、変更後の規約に同意したものと扱います。"] },
  { heading: "8. 準拠法", paragraphs: ["本規約は日本法に準拠します。本サービスに関する紛争は、運営者の所在地を管轄する日本の裁判所を第一審の専属的合意管轄裁判所とします。"] }
];

export default function TermsPage() {
  return (
    <AppShell>
      <LegalDocumentPage
        title="利用規約"
        intro="この利用規約は、のみログを利用する際のルールを定めるものです。サービスを利用する前にご確認ください。"
        metadata={{ establishedAt: legalEstablishedAt, updatedAt: legalUpdatedAt, operatorName: publicOperatorName, contactEmail: publicContactEmail }}
        sections={sections}
      />
    </AppShell>
  );
}
