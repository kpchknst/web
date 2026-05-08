import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { listArticles } from '../api/articles.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import Spinner from '../components/Spinner.jsx';
import { buildExcerpt } from '../utils/format.js';
import { getStoneImageUrl } from '../utils/stoneImages.js';

const FALLBACK_TAG = 'with-perfume-notes';

function ArticleCard({ article }) {
    const tagSlugs = (article.tags || []).map((tag) => tag.slug);
    const headerTag = tagSlugs[0] || FALLBACK_TAG;
    const metaTags = tagSlugs.length === 0 ? FALLBACK_TAG : tagSlugs.join(' · ');
    const imageSrc = getStoneImageUrl(article.slug);
    return (
        <article className="card">
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

export default function HomePage() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await listArticles();
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
    }, []);

    return (
        <>
            <section className="page-home__hero" aria-labelledby="hero-title">
                <h1 id="hero-title" className="page-home__hero-title">Stones &amp; Scents</h1>
                <p className="page-home__hero-subtitle">
                    A growing public encyclopedia of natural stones and minerals — every
                    entry pairs the geology and lore with a hand-picked perfume that
                    matches the stone&apos;s character.
                </p>
            </section>

            {loading && <Spinner label="Loading articles…" />}

            {!loading && error && (
                <Alert variant="danger" title="Couldn't load articles">
                    {`${error} — is the backend running on http://localhost:8001?`}
                </Alert>
            )}

            {!loading && !error && articles.length === 0 && (
                <Alert variant="info" title="No articles yet">
                    Seed the database with
                    {' '}
                    <code>python -m app.seed</code>
                    .
                </Alert>
            )}

            {!loading && !error && articles.length > 0 && (
                <section className="page-home__grid" aria-label="Article list">
                    {articles.map((article) => (
                        <ArticleCard key={article.id} article={article} />
                    ))}
                </section>
            )}
        </>
    );
}
