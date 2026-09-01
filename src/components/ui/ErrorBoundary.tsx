import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Props {
  children: ReactNode;
  /** Shown instead of the default panel, e.g. for a single view. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Keeps one broken view from taking down the whole studio. Anything the user
 * has typed is already persisted by autosave, so recovery is a re-render.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[creatura] view error', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertTriangle size={22} className="text-[var(--color-danger)]" aria-hidden="true" />
        <div>
          <h2 className="type-display text-[1.3rem] text-[var(--color-ink)]">
            {this.props.label ?? 'Something went wrong'}
          </h2>
          <p className="mt-2 max-w-md text-[0.82rem] leading-relaxed text-[var(--color-ink-muted)]">
            Your work is saved. This view hit an unexpected error and stopped rendering.
          </p>
          <pre className="mt-3 max-w-md overflow-x-auto rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] p-2 text-left font-mono text-[0.7rem] text-[var(--color-ink-faint)]">
            {error.message}
          </pre>
        </div>
        <Button variant="secondary" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}
