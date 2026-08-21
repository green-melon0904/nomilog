import { MobilePageHeader } from "@/components/MobilePageHeader";

type LegalSection = { heading: string; paragraphs: string[]; items?: string[] };

/** 法務文書の見出し・本文・箇条書きを、モバイルで読みやすい一定幅へ揃える。 */
export function LegalDocumentPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="screen pb-10">
      <MobilePageHeader title={title} />
      <article className="pt-6 text-[13px] font-normal leading-[1.9] text-[#353a40]">
        <p>{intro}</p>
        <p className="mt-2 text-[11px] text-[var(--muted)]">最終更新日: 2026年8月21日</p>
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
