import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/store/uiStore';

/**
 * A single confirmation dialog driven from the UI store, so any call site can
 * ask for confirmation with `confirm({...})` and await the answer.
 */
export function ConfirmDialogHost() {
  const request = useUiStore((s) => s.confirmRequest);
  const resolve = useUiStore((s) => s.resolveConfirm);

  return (
    <Modal
      open={request !== null}
      onClose={() => resolve(false)}
      title={request?.title ?? ''}
      description={request?.body}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => resolve(false)}>
            {request?.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            variant={request?.destructive ? 'danger' : 'primary'}
            onClick={() => resolve(true)}
          >
            {request?.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      {request?.detail && (
        <p className="text-[0.82rem] leading-relaxed text-[var(--color-ink-muted)]">
          {request.detail}
        </p>
      )}
    </Modal>
  );
}
