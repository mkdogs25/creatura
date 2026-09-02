import { useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { orderedChapters } from '@/store/selectors';
import { richContentToHtml } from '@/utils/richContentToHtml';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * The whole browser tab, given over to a print-ready view of the manuscript
 * — what "Export to PDF" opens (`?print=manuscript`). Printing this (or
 * choosing "Save as PDF" in the browser's print dialog) is the export: a
 * real, text-based PDF via the browser's own renderer rather than a
 * rasterized image, which is both higher quality and needs no extra library.
 */
export function PrintManuscriptView() {
  const bundle = useProjectStore((s) => s.bundle);
  const loading = useProjectStore((s) => s.loading);
  const chapters = useMemo(() => (bundle ? orderedChapters(bundle) : []), [bundle]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[0.82rem] text-[var(--color-ink-faint)]">
        Preparing the manuscript…
      </div>
    );
  }

  if (!bundle || chapters.length === 0) {
    return (
      <EmptyState
        icon={Printer}
        title="Nothing to print."
        body="This tab's active project doesn't have any chapters yet."
      />
    );
  }

  return (
    <div className="min-h-screen w-full shrink-0 bg-white">
      <style>{`
        @page { margin: 1in; }
        @media print {
          .no-print { display: none !important; }
          .print-chapter { break-before: page; }
          .print-chapter:first-of-type { break-before: avoid; }
        }
        .creatura-prose-print p { margin: 0 0 1em; }
        .creatura-prose-print h1, .creatura-prose-print h2, .creatura-prose-print h3 {
          margin: 1.4em 0 0.6em;
          font-weight: 600;
        }
        .creatura-prose-print ul, .creatura-prose-print ol { margin: 0 0 1em; padding-left: 1.4em; }
        .creatura-prose-print blockquote {
          margin: 0 0 1em;
          padding-left: 1em;
          border-left: 2px solid rgba(0, 0, 0, 0.2);
          color: rgba(0, 0, 0, 0.7);
        }
        .creatura-prose-print hr { margin: 2em 0; border: none; border-top: 1px solid rgba(0, 0, 0, 0.2); }
        .creatura-prose-print .entity-ref {
          background: none;
          border-bottom: none;
          padding: 0;
          color: inherit;
          font-weight: inherit;
          cursor: text;
        }
      `}</style>

      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white/95 px-6 py-3 backdrop-blur">
        <span className="text-[0.8rem] text-black/60">
          {bundle.project.name} · {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'}
        </span>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer size={14} />
          Print / Save as PDF
        </Button>
      </div>

      <article
        className="mx-auto max-w-[42rem] px-8 py-12 text-black"
        style={{ fontFamily: 'var(--font-prose)', fontSize: '12pt', lineHeight: 1.6 }}
      >
        <header className="mb-16 text-center">
          <h1 className="text-[2rem] font-semibold tracking-tight">{bundle.project.name}</h1>
          {bundle.project.description && (
            <p className="mt-3 text-[0.9rem] text-black/60">{bundle.project.description}</p>
          )}
        </header>

        {chapters.map((chapter) => (
          <section key={chapter.id} className="print-chapter mb-14">
            <h1 className="mb-6 text-[1.5rem] font-semibold">{chapter.title}</h1>
            <div
              className="creatura-prose-print"
              // Generated from the project's own Tiptap content via the same
              // schema the editor uses — not user-supplied raw HTML.
              dangerouslySetInnerHTML={{ __html: richContentToHtml(chapter.content, bundle) }}
            />
          </section>
        ))}
      </article>
    </div>
  );
}
