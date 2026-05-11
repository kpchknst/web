import { useEffect, useState } from 'react';

const MAX_REASON = 500;

export default function RejectModal({
    open,
    onCancel,
    onConfirm,
    busy = false,
}) {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (open) {
            setReason('');
        }
    }, [open]);

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

    const trimmed = reason.trim();
    const canSubmit = trimmed.length >= 1 && trimmed.length <= MAX_REASON && !busy;

    return (
        <div className="modal-overlay">
            <div
                className="modal"
                role="alertdialog"
                aria-labelledby="reject-modal-title"
                aria-describedby="reject-modal-body"
            >
                <div className="modal__header">
                    <h3 id="reject-modal-title" className="modal__title">Reject this edit</h3>
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
                <div className="modal__body" id="reject-modal-body">
                    <label className="form-field__label" htmlFor="reject-modal-reason">
                        Reason (visible to the editor)
                    </label>
                    <textarea
                        id="reject-modal-reason"
                        className="form-input"
                        rows={4}
                        maxLength={MAX_REASON}
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        disabled={busy}
                        required
                    />
                    <p className="form-field__hint">{`${trimmed.length} / ${MAX_REASON} characters`}</p>
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={onCancel}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn--danger"
                            onClick={() => onConfirm(trimmed)}
                            disabled={!canSubmit}
                        >
                            {busy ? 'Working…' : 'Reject'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
