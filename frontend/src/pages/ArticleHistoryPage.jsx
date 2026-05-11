import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { getArticleBySlug, getArticleHistory } from '../api/articles.js';
import Alert from '../components/Alert.jsx';
import DiffView from '../components/DiffView.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDateTime } from '../utils/format.js';

function pickError(exc, fallback) {
    return exc?.response?.data?.detail || exc?.message || fallback;
}

function shortEditor(editorId) {
    if (!editorId) return 'unknown';
    return editorId.slice(0, 8);
}

export default function ArticleHistoryPage() {
    const { slug } = useParams();
    const [article, setArticle] = useState(null);
    const [historyEntries, setHistoryEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const [art, history] = await Promise.all([
                    getArticleBySlug(slug),
                    getArticleHistory(slug),
                ]);
                if (cancelled) return;
                setArticle(art);
                setHistoryEntries(Array.isArray(history) ? history : []);
            } catch (caught) {
                if (!cancelled) {
                    setError(pickError(caught, 'Could not load history'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return <Spinner label="Loading history…" />;
    }

    if (error) {
        return <Alert variant="danger" title="Couldn't load history">{error}</Alert>;
    }

    if (!article) {
        return null;
    }

    return (
        <section className="page-history" aria-labelledby="history-title">
            <p className="page-user-form__breadcrumb">
                <Link to="/">Home</Link>
                {' / '}
                <Link to={`/articles/${article.slug}`}>{article.title}</Link>
                {' / History'}
            </p>
            <h1 id="history-title" className="page-user-form__title">
                {`History — ${article.title}`}
            </h1>

            {historyEntries.length === 0 && (
                <Alert variant="info" title="No history yet">
                    No approved edits yet for this article.
                </Alert>
            )}

            {historyEntries.map((entry, idx) => {
                const oldText = idx === 0
                    ? ''
                    : historyEntries[idx - 1].proposed_content;
                return (
                    <article
                        className="page-history__entry"
                        key={entry.id}
                        aria-labelledby={`history-entry-${entry.id}`}
                    >
                        <h2
                            id={`history-entry-${entry.id}`}
                            className="page-user-detail__readings-title"
                        >
                            {`Edit by editor #${shortEditor(entry.editor_id)}`}
                        </h2>
                        <p className="edit-card__meta">
                            {entry.reviewed_at
                                ? `Approved ${formatDateTime(entry.reviewed_at)}`
                                : `Submitted ${formatDateTime(entry.submitted_at)}`}
                            {` • base v${entry.base_version}`}
                        </p>
                        <DiffView
                            oldText={oldText}
                            newText={entry.proposed_content}
                            oldLabel="Before"
                            newLabel="After"
                        />
                    </article>
                );
            })}
        </section>
    );
}
