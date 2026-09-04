import { useMemo } from 'react';
import { FileX2, Printer } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { docById, categoryOf } from '@/store/selectors';
import { richContentToHtml } from '@/utils/richContentToHtml';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/**
 * The whole browser tab, given over to a print-ready view of one document —
 * a note's prose, or a category document's profile fields as a plain
 * label/value sheet. What "Export as PDF" opens (`?print=doc&id=...`) for
 * any single entry in the library, the same way `?print=manuscript` covers
 * the whole manuscript: printing this (or "Save as PDF" in the browser's
 * print dialog) is the actual export.
 */
export function PrintDocView({ docId }: { docId: string }) {
  const bundle = useProjectStore((s) => s.bundle);
  const loading = useProjectStore((s) => s.loading);
  const doc = useMemo(() => docById(bundle, docId), [bundle, docId]);
  const category = useMemo(() => (doc ? categoryOf(bundle, doc) : null), [bundle, doc]);
  const tags = useMemo(
    () => (doc ? doc.tagIds.map((id) => bundle?.tags.find((t) => t.id === id)).filter(Boolean) : []),
    [bundle, doc],
  );

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-[0.82rem] text-[var(--color-ink-faint)]">
        Preparing the document…
      </div>
    );
  }

  if (!bundle || !doc) {
    return (
      <EmptyState
        icon={FileX2}
        title="Nothing to print."
        body="This tab's active project doesn't have that document."
      />
    );
  }

  const profile = 'profile' in doc ? doc.profile : {};

  return (
    <div className="min-h-screen w-full shrink-0 bg-white">
      <style>{`
        @page { margin: 1in; }
        @media print { .no-print { display: none !important; } }
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
          {bundle.project.name} · {doc.name}
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
        <header className="mb-10">
          <p className="text-[0.75rem] tracking-wide text-black/50 uppercase">
            {category ? category.name.replace(/s$/, '') : 'Note'}
          </p>
          <h1 className="text-[1.9rem] font-semibold tracking-tight">{doc.name}</h1>
          {tags.length > 0 && (
            <p className="mt-2 text-[0.82rem] text-black/50">
              {tags.map((tag) => `#${tag!.name}`).join('  ')}
            </p>
          )}
        </header>

        {category ? (
          <dl className="space-y-5">
            {category.fields.map((field) => {
              const value = profile[field.id] ?? '';
              if (!value.trim()) return null;
              return (
                <div key={field.id}>
                  <dt className="text-[0.72rem] font-semibold tracking-wide text-black/50 uppercase">
                    {field.label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-[0.92rem]">{value}</dd>
                </div>
              );
            })}
          </dl>
        ) : (
          <div
            className="creatura-prose-print"
            // Generated from the project's own Tiptap content via the same
            // schema the editor uses — not user-supplied raw HTML.
            dangerouslySetInnerHTML={{ __html: richContentToHtml(doc.content, bundle) }}
          />
        )}
      </article>
    </div>
  );
}
