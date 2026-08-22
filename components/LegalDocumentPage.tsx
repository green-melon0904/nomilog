import { MobilePageHeader } from "@/components/MobilePageHeader";

type LegalSection = { heading: string; paragraphs: string[]; items?: string[] };
type LegalMetadata = {
  establishedAt: string;
  updatedAt: string;
  operatorName: string;
  contactEmail: string;
};

/** 法務文書の運営情報・見出し・本文を、モバイルで追いやすい順序と一定幅へ揃える。 */
export function LegalDocumentPage({
  title,
  intro,
  metadata,
  sections
}: {
  title: string;
  intro: string;
  metadata: LegalMetadata;
  sections: LegalSection[];
}) {
  return (
    <div className="screen pb-10">
      <MobilePageHeader title={title} />
      <article className="pt-6 text-[13px] font-normal leading-[1.9] text-[#353a40]">
        <p>{intro}</p>
        <dl className="mt-5 grid grid-cols-[84px_1fr] gap-x-3 gap-y-1 border-y border-[var(--border)] py-4 text-[12px]">
          <dt className="text-[var(--muted)]">制定日</dt><dd>{metadata.establishedAt}</dd>
          <dt className="text-[var(--muted)]">最終更新日</dt><dd>{metadata.updatedAt}</dd>
          <dt className="text-[var(--muted)]">運営主体</dt><dd>{metadata.operatorName}</dd>
          <dt className="text-[var(--muted)]">お問い合わせ</dt>
          <dd><a className="break-all text-[var(--accent)] underline underline-offset-2" href={`mailto:${metadata.contactEmail}`}>{metadata.contactEmail}</a></dd>
        </dl>
        {sections.map((section) => (
          <section key={section.heading} className="mt-7 border-t border-[var(--border)] pt-5">
            <h2 className="text-[16px] font-semibold text-[var(--text)]">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-3">{paragraph}</p>)}
            {section.items ? <ul className="mt-3 list-disc space-y-1 pl-5">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
          </section>
        ))}
      </article>
    </div>
  );
}
