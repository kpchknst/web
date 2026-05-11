import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteArticle, getArticleBySlug } from '../api/articles.js';
import useAuth from '../auth/useAuth.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate, splitParagraphs } from '../utils/format.js';
import { getStoneImageUrl } from '../utils/stoneImages.js';

export default function ArticlePage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await getArticleBySlug(slug);
                if (!cancelled) {
                    setArticle(data);
                    document.title = `Stones & Scents — ${data.title}`;
                }
            } catch (caught) {
                if (!cancelled) {
                    setError(caught?.message || 'Network error');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [slug]);

    if (loading) {
        return <Spinner label="Loading article…" />;
    }

    if (error) {
        return (
            <Alert variant="danger" title="Couldn't load this article">
                {error}
            </Alert>
        );
    }

    if (!article) {
        return null;
    }

    const updated = formatDate(article.updated_at);
    const paragraphs = splitParagraphs(article.content);
    const heroSrc = getStoneImageUrl(article.slug);
    const isAdmin = user?.role === 'admin';

    const handleDelete = async () => {
        setDeleteBusy(true);
        try {
            await deleteArticle(slug);
            navigate('/', { replace: true });
        } catch (caught) {
            setError(caught?.message || 'Could not delete article');
            setDeleteBusy(false);
            setDeleteOpen(false);
        }
    };

    return (
        <article className="page-article" aria-labelledby="article-title">
            <p className="page-article__breadcrumb">
                <Link to="/">Home</Link>
                {' / '}
                {article.title}
            </p>

            {heroSrc ? (
                <img
                    className="page-article__hero"
                    src={heroSrc}
                    alt={`${article.title} illustration`}
                />
            ) : (
                <div
                    className={`page-article__hero page-article__hero--${article.slug}`}
                    role="img"
                    aria-label={`${article.title} illustration`}
                />
            )}

            <h1 id="article-title" className="page-article__title">{article.title}</h1>
            <p className="page-article__meta">
                {`Version ${article.version} · Updated ${updated} · `}
                <Link to={`/articles/${slug}/history`}>View history</Link>
            </p>

            <div className="page-article__tags">
                {(article.tags || []).map((tag) => (
                    <Badge key={tag.id} variant="tag">{tag.slug}</Badge>
                ))}
            </div>

            <div className="page-article__body">
                {paragraphs.map((para, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <p key={index}>{para}</p>
                ))}
            </div>

            {user && (
                <div className="page-article__actions">
                    {isAdmin ? (
                        <>
                            <Link className="btn btn--secondary" to={`/articles/${slug}/edit`}>
                                Edit article
                            </Link>
                            <button
                                type="button"
                                className="btn btn--danger"
                                onClick={() => setDeleteOpen(true)}
                            >
                                Delete article
                            </button>
                        </>
                    ) : (
                        <Link className="btn btn--secondary" to={`/articles/${slug}/edit`}>
                            Propose edit
                        </Link>
                    )}
                </div>
            )}

            <ConfirmModal
                open={deleteOpen}
                title="Delete article?"
                confirmLabel="Delete article"
                cancelLabel="Cancel"
                danger
                busy={deleteBusy}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
            >
                {`This will permanently delete "${article.title}". This action cannot be undone.`}
            </ConfirmModal>
        </article>
    );
}
