import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { listArticles } from '../api/articles.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import SearchBox from '../components/SearchBox.jsx';
import Spinner from '../components/Spinner.jsx';
import TagFilter from '../components/TagFilter.jsx';
import useRevealOnScroll from '../hooks/useRevealOnScroll.js';
import { buildExcerpt } from '../utils/format.js';
import { getStoneImageUrl } from '../utils/stoneImages.js';

const FALLBACK_TAG = 'with-perfume-notes';

function ArticleCard({ article, index }) {
    const tagSlugs = (article.tags || []).map((tag) => tag.slug);
    const headerTag = tagSlugs[0] || FALLBACK_TAG;
    const metaTags = tagSlugs.length === 0 ? FALLBACK_TAG : tagSlugs.join(' · ');
    const imageSrc = getStoneImageUrl(article.slug);
    const delay = `${Math.min(index, 9) * 60}ms`;
    return (
        <article className="card" data-reveal style={{ transitionDelay: delay }}>
            {imageSrc ? (
                <img
                    className="card__thumb"
                    src={imageSrc}
                    alt={`${article.title} illustration`}
                    loading="lazy"
                />
            ) : (
                <div
                    className={`card__thumb card__thumb--${article.slug}`}
                    role="img"
                    aria-label={`${article.title} illustration`}
                />
            )}
            <h2 className="card__title">{article.title}</h2>
            <p className="card__meta">
                {`v${article.version} · ${metaTags}`}
            </p>
            <p className="card__body">{buildExcerpt(article.content)}</p>
            <div className="card__footer">
                <Badge variant="tag">{headerTag}</Badge>
                <Link className="btn btn--small btn--ghost" to={`/articles/${article.slug}`}>
                    Read →
                </Link>
            </div>
        </article>
    );
}

function parseTagsParam(value) {
    if (!value) return [];
    return value.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function HomePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const q = searchParams.get('q') || '';
    const tagsParam = searchParams.get('tag') || '';
    const tagsArray = parseTagsParam(tagsParam);

    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const params = {};
                if (q) params.q = q;
                if (tagsArray.length > 0) [params.tag] = tagsArray;
                const data = await listArticles(params);
                if (!cancelled) {
                    setArticles(Array.isArray(data) ? data : []);
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
    // tagsArray is derived from tagsParam — re-running on tagsParam covers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [q, tagsParam]);

    const updateParams = (next) => {
        const params = {};
        if (next.q) params.q = next.q;
        if (next.tag) params.tag = next.tag;
        setSearchParams(params, { replace: true });
    };

    const handleSearchChange = (value) => {
        updateParams({ q: value, tag: tagsParam });
    };

    const handleTagChange = (arr) => {
        updateParams({ q, tag: arr.join(',') });
    };

    const filtersActive = Boolean(q) || tagsArray.length > 0;

    useRevealOnScroll([articles, loading]);

    return (
        <>
            <section className="page-home__hero" aria-labelledby="hero-title">
                <h1 id="hero-title" className="page-home__hero-title">Stones &amp; Scents</h1>
                <p className="page-home__hero-subtitle">
                    A growing public encyclopedia of natural stones and minerals — every
                    entry pairs the geology and lore with a hand-picked perfume that
                    matches the stone&apos;s character.
                </p>
                <button
                    type="button"
                    className="btn btn--small"
                    onClick={() => {
                        console.log('Hello user!');
                        alert('Hello user!');
                    }}
                >
                    Say hello
                </button>
            </section>

            <section className="page-home__filters" aria-label="Filters">
                <SearchBox
                    value={q}
                    onChange={handleSearchChange}
                    placeholder="Search articles…"
                />
                <TagFilter selected={tagsArray} onChange={handleTagChange} />
            </section>

            {loading && <Spinner label="Loading articles…" />}

            {!loading && error && (
                <Alert variant="danger" title="Couldn't load articles">
                    {`${error} — is the backend running on http://localhost:8001?`}
                </Alert>
            )}

            {!loading && !error && articles.length === 0 && filtersActive && (
                <Alert variant="info" title="No articles match">
                    Try clearing the search or removing tag filters.
                </Alert>
            )}

            {!loading && !error && articles.length === 0 && !filtersActive && (
                <Alert variant="info" title="No articles yet">
                    Seed the database with
                    {' '}
                    <code>python -m app.seed</code>
                    .
                </Alert>
            )}

            {!loading && !error && articles.length > 0 && (
                <section className="page-home__grid" aria-label="Article list">
                    {articles.map((article, index) => (
                        <ArticleCard key={article.id} article={article} index={index} />
                    ))}
                </section>
            )}
        </>
    );
}
