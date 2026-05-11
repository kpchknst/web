import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
    createArticle,
    getArticleBySlug,
    updateArticle,
} from '../api/articles.js';
import { listEdits, proposeEdit } from '../api/edits.js';
import { listTags } from '../api/tags.js';
import useAuth from '../auth/useAuth.js';
import Alert from '../components/Alert.jsx';
import CharCounter from '../components/CharCounter.jsx';
import CoverImageInput from '../components/CoverImageInput.jsx';
import EditConflictBanner from '../components/EditConflictBanner.jsx';
import Spinner from '../components/Spinner.jsx';
import TagFilter from '../components/TagFilter.jsx';
import slugify from '../utils/slugify.js';

const CONTENT_MAX = 2000;

function pickError(exc, fallback) {
    return exc?.response?.data?.detail || exc?.message || fallback;
}

export default function ArticleEditorPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isCreate = !slug;
    const isAdmin = user?.role === 'admin';

    const [article, setArticle] = useState(null);
    const [pendingEdits, setPendingEdits] = useState([]);
    const [tags, setTags] = useState([]);

    const [title, setTitle] = useState('');
    const [articleSlug, setArticleSlug] = useState('');
    const [content, setContent] = useState('');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [tagSlugs, setTagSlugs] = useState([]);

    const slugTouched = useRef(false);
    const [loading, setLoading] = useState(!isCreate);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        listTags()
            .then((data) => {
                if (!cancelled) setTags(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                if (!cancelled) setTags([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (isCreate) {
            return undefined;
        }
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await getArticleBySlug(slug);
                if (cancelled) return;
                setArticle(data);
                setTitle(data.title || '');
                setContent(data.content || '');
                setCoverImageUrl(data.cover_image_url || '');
                setTagSlugs((data.tags || []).map((t) => t.slug));
                try {
                    const edits = await listEdits({
                        status: 'pending',
                        article_slug: slug,
                    });
                    if (!cancelled) {
                        setPendingEdits(Array.isArray(edits) ? edits : []);
                    }
                } catch (_) {
                    if (!cancelled) setPendingEdits([]);
                }
            } catch (caught) {
                if (!cancelled) {
                    setError(pickError(caught, 'Could not load article'));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [slug, isCreate]);

    const handleTitleChange = (event) => {
        const next = event.target.value;
        setTitle(next);
        if (isCreate && !slugTouched.current) {
            setArticleSlug(slugify(next));
        }
    };

    const handleSlugChange = (event) => {
        slugTouched.current = true;
        setArticleSlug(event.target.value);
    };

    const tagIds = useMemo(() => {
        if (tags.length === 0) return tagSlugs;
        const slugToId = new Map(tags.map((t) => [t.slug, t.id]));
        return tagSlugs
            .map((s) => slugToId.get(s))
            .filter((id) => id !== undefined);
    }, [tagSlugs, tags]);

    const submitLabel = (() => {
        if (isCreate) return 'Create article';
        return isAdmin ? 'Save changes' : 'Propose edit';
    })();

    const submit = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        setError('');
        try {
            if (isCreate) {
                await createArticle({
                    title: title.trim(),
                    slug: articleSlug.trim(),
                    content,
                    cover_image_url: coverImageUrl || null,
                    tag_ids: tagIds,
                });
                navigate(`/articles/${articleSlug.trim()}`);
            } else if (isAdmin) {
                await updateArticle(slug, {
                    title: title.trim(),
                    content,
                    cover_image_url: coverImageUrl || null,
                    tag_ids: tagIds,
                });
                navigate(`/articles/${slug}`);
            } else {
                await proposeEdit(slug, {
                    proposed_title: title.trim(),
                    proposed_content: content,
                    base_version: article.version,
                });
                navigate('/profile');
            }
        } catch (caught) {
            setError(pickError(caught, 'Could not save'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Spinner label="Loading editor…" />;
    }

    const breadcrumb = isCreate
        ? <Link to="/">Home</Link>
        : <Link to={`/articles/${slug}`}>{article?.title || slug}</Link>;

    const titleHeading = (() => {
        if (isCreate) return 'New article';
        return isAdmin ? `Edit: ${article?.title || ''}` : `Propose edit: ${article?.title || ''}`;
    })();

    const canSubmit = title.trim().length > 0
        && content.length > 0
        && content.length <= CONTENT_MAX
        && (!isCreate || articleSlug.trim().length > 0);

    return (
        <section className="page-article-editor" aria-labelledby="article-editor-title">
            <p className="page-user-form__breadcrumb">
                {breadcrumb}
                {isCreate ? ' / New article' : ' / Editor'}
            </p>
            <h1 id="article-editor-title" className="page-user-form__title">
                {titleHeading}
            </h1>

            {error && (
                <Alert variant="danger" title="Couldn't save">{error}</Alert>
            )}

            {!isCreate && pendingEdits.length > 0 && (
                <EditConflictBanner
                    pendingEdits={pendingEdits}
                    articleSlug={slug}
                    isAdmin={isAdmin}
                />
            )}

            <form className="form page-article-editor__form" onSubmit={submit} noValidate>
                <div className="form-field">
                    <label
                        className="form-field__label form-field__label--required"
                        htmlFor="article-editor-title-input"
                    >
                        Title
                    </label>
                    <input
                        id="article-editor-title-input"
                        className="form-input"
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        maxLength={200}
                        required
                    />
                </div>

                {isCreate && (
                    <div className="form-field">
                        <label
                            className="form-field__label form-field__label--required"
                            htmlFor="article-editor-slug-input"
                        >
                            Slug
                        </label>
                        <input
                            id="article-editor-slug-input"
                            className="form-input"
                            type="text"
                            value={articleSlug}
                            onChange={handleSlugChange}
                            maxLength={100}
                            pattern="[a-z0-9-]+"
                            required
                        />
                        <p className="form-field__hint">
                            Lowercase letters, digits and hyphens only. Auto-filled from title.
                        </p>
                    </div>
                )}

                <div className="form-field">
                    <label
                        className="form-field__label form-field__label--required"
                        htmlFor="article-editor-content"
                    >
                        Content
                    </label>
                    <textarea
                        id="article-editor-content"
                        className="form-input"
                        rows={14}
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        maxLength={CONTENT_MAX}
                        required
                    />
                    <div className="page-article-editor__counter-row">
                        <CharCounter value={content} max={CONTENT_MAX} />
                    </div>
                </div>

                {isAdmin && (
                    <CoverImageInput
                        value={coverImageUrl}
                        onChange={setCoverImageUrl}
                    />
                )}

                {isAdmin && (
                    <div className="form-field">
                        <span className="form-field__label">Tags</span>
                        <TagFilter selected={tagSlugs} onChange={setTagSlugs} />
                    </div>
                )}

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => navigate(isCreate ? '/' : `/articles/${slug}`)}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={saving || !canSubmit}
                    >
                        {saving ? 'Saving…' : submitLabel}
                    </button>
                </div>
            </form>
        </section>
    );
}
