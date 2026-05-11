import { useCallback, useEffect, useState } from 'react';

import { listArticles } from '../api/articles.js';
import {
    approveEdit,
    getEdit,
    listEdits,
    rejectEdit,
} from '../api/edits.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import EditCard from '../components/EditCard.jsx';
import DiffView from '../components/DiffView.jsx';
import RejectModal from '../components/RejectModal.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDateTime } from '../utils/format.js';

function pickError(exc, fallback) {
    return exc?.response?.data?.detail || exc?.message || fallback;
}

function buildArticlesById(articles) {
    const map = {};
    (articles || []).forEach((article) => {
        map[article.id] = article;
    });
    return map;
}

function SelectedEditPanel({
    edit,
    article,
    actionBusy,
    onApprove,
    onAskReject,
}) {
    if (!edit) {
        return (
            <Alert variant="info" title="Pick an edit">
                Choose an edit on the left to review and act on it.
            </Alert>
        );
    }
    if (!article) {
        return <Spinner label="Loading article…" />;
    }
    const isStale = edit.base_version < article.version;
    return (
        <div>
            <div className="edit-card__head">
                <Badge variant="role-regular">Pending</Badge>
                {isStale && <Badge variant="tag">stale</Badge>}
            </div>
            <h2 className="page-user-detail__name">{edit.proposed_title}</h2>
            <p className="edit-card__meta">
                {`Editor #${(edit.editor_id || '').slice(0, 8)} • `}
                {`Submitted ${formatDateTime(edit.submitted_at)} • `}
                {`base v${edit.base_version} (live v${article.version})`}
            </p>
            {isStale && (
                <Alert variant="warning" title="Stale base">
                    The article has changed since this edit was proposed. Review
                    carefully — approving will overwrite the live content.
                </Alert>
            )}
            <DiffView
                oldText={article.content}
                newText={edit.proposed_content}
                oldLabel={`Live (v${article.version})`}
                newLabel="Proposed"
            />
            <div className="form-actions">
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={onApprove}
                    disabled={actionBusy}
                >
                    Approve
                </button>
                <button
                    type="button"
                    className="btn btn--danger"
                    onClick={onAskReject}
                    disabled={actionBusy}
                >
                    Reject
                </button>
            </div>
        </div>
    );
}

export default function ModerationQueuePage() {
    const [pendingEdits, setPendingEdits] = useState([]);
    const [articlesById, setArticlesById] = useState({});
    const [selectedEditId, setSelectedEditId] = useState(null);
    const [selectedEdit, setSelectedEdit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [rejectOpen, setRejectOpen] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');

    const refreshQueue = useCallback(async () => {
        const [edits, articles] = await Promise.all([
            listEdits({ status: 'pending' }),
            listArticles(),
        ]);
        setPendingEdits(Array.isArray(edits) ? edits : []);
        setArticlesById(buildArticlesById(articles));
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                await refreshQueue();
            } catch (caught) {
                if (!cancelled) {
                    setError(pickError(caught, 'Could not load queue'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [refreshQueue]);

    useEffect(() => {
        if (!selectedEditId) {
            setSelectedEdit(null);
            return undefined;
        }
        let cancelled = false;
        getEdit(selectedEditId)
            .then((data) => {
                if (!cancelled) setSelectedEdit(data);
            })
            .catch((caught) => {
                if (!cancelled) {
                    setActionError(pickError(caught, 'Could not load edit'));
                    setSelectedEdit(null);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [selectedEditId]);

    const selectedArticle = selectedEdit
        ? articlesById[selectedEdit.article_id]
        : null;

    const handleAfterAction = async (toast) => {
        setActionSuccess(toast);
        setActionError('');
        setSelectedEditId(null);
        try {
            await refreshQueue();
        } catch (caught) {
            setError(pickError(caught, 'Could not refresh queue'));
        }
    };

    const handleApprove = async () => {
        if (!selectedEdit) return;
        setActionBusy(true);
        setActionError('');
        try {
            await approveEdit(selectedEdit.id);
            await handleAfterAction('Edit approved.');
        } catch (caught) {
            const status = caught?.response?.status;
            if (status === 409) {
                setActionError('This edit was already reviewed. Refreshing the queue.');
                setSelectedEditId(null);
                try {
                    await refreshQueue();
                } catch (_) { /* surfaced via error state above */ }
            } else {
                setActionError(pickError(caught, 'Could not approve'));
            }
        } finally {
            setActionBusy(false);
        }
    };

    const handleReject = async (reason) => {
        if (!selectedEdit) return;
        setActionBusy(true);
        setActionError('');
        try {
            await rejectEdit(selectedEdit.id, reason);
            setRejectOpen(false);
            await handleAfterAction('Edit rejected.');
        } catch (caught) {
            const status = caught?.response?.status;
            if (status === 409) {
                setRejectOpen(false);
                setActionError('This edit was already reviewed. Refreshing the queue.');
                setSelectedEditId(null);
                try {
                    await refreshQueue();
                } catch (_) { /* surfaced via error state above */ }
            } else {
                setActionError(pickError(caught, 'Could not reject'));
            }
        } finally {
            setActionBusy(false);
        }
    };

    if (loading) {
        return <Spinner label="Loading moderation queue…" />;
    }

    return (
        <section className="page-moderation" aria-labelledby="moderation-title">
            <h1 id="moderation-title" className="page-user-form__title">
                Moderation
            </h1>

            {error && (
                <Alert variant="danger" title="Couldn't load queue">{error}</Alert>
            )}
            {actionError && (
                <Alert variant="warning" title="Action">{actionError}</Alert>
            )}
            {actionSuccess && (
                <Alert variant="success" title="Done">{actionSuccess}</Alert>
            )}

            <div className="page-moderation__layout">
                <aside aria-labelledby="queue-title">
                    <h2 id="queue-title" className="page-user-detail__name">
                        {`Queue (${pendingEdits.length})`}
                    </h2>
                    {pendingEdits.length === 0 && (
                        <Alert variant="info" title="Inbox zero">
                            No pending edits right now.
                        </Alert>
                    )}
                    {pendingEdits.map((edit) => (
                        <EditCard
                            key={edit.id}
                            edit={edit}
                            onClick={() => setSelectedEditId(edit.id)}
                            articleVersion={articlesById[edit.article_id]?.version}
                        />
                    ))}
                </aside>
                <section aria-labelledby="moderation-detail-title">
                    <h2 id="moderation-detail-title" className="page-user-detail__name">
                        Detail
                    </h2>
                    <SelectedEditPanel
                        edit={selectedEdit}
                        article={selectedArticle}
                        actionBusy={actionBusy}
                        onApprove={handleApprove}
                        onAskReject={() => setRejectOpen(true)}
                    />
                </section>
            </div>

            <RejectModal
                open={rejectOpen}
                busy={actionBusy}
                onCancel={() => setRejectOpen(false)}
                onConfirm={handleReject}
            />
        </section>
    );
}
