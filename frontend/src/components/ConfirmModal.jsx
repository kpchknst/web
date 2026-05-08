import { useEffect } from 'react';

export default function ConfirmModal({
    open,
    title,
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    onConfirm,
    onCancel,
    busy = false,
    danger = false,
}) {
    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const handleKey = (event) => {
            if (event.key === 'Escape' && !busy) {
                onCancel();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open, busy, onCancel]);

    if (!open) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div
                className="modal"
                role="alertdialog"
                aria-labelledby="confirm-modal-title"
                aria-describedby="confirm-modal-body"
            >
                <div className="modal__header">
                    <h3 id="confirm-modal-title" className="modal__title">{title}</h3>
                    <button
                        type="button"
                        className="modal__close"
                        aria-label="Close"
                        onClick={onCancel}
                        disabled={busy}
                    >
                        ×
                    </button>
                </div>
                <div className="modal__body">
                    <p id="confirm-modal-body">{children}</p>
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={onCancel}
                            disabled={busy}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
                            onClick={onConfirm}
                            disabled={busy}
                        >
                            {busy ? 'Working…' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
