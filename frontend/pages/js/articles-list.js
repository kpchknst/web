import { apiGet, isLocalEnvironment } from './api.js';
import { buildExcerpt, escapeHtml } from './dom.js';

const FALLBACK_TAG = 'with-perfume-notes';

const renderCard = (article) => {
    const tagSlugs = (article.tags ?? []).map((tag) => tag.slug);
    const headerTag = tagSlugs[0] ?? FALLBACK_TAG;
    const metaTags = tagSlugs.length === 0 ? FALLBACK_TAG : tagSlugs.join(' · ');
    const slugClass = `card__thumb--${escapeHtml(article.slug)}`;
    const hrefSlug = encodeURIComponent(article.slug);
    return `
        <article class="card">
            <div class="card__thumb ${slugClass}" role="img"
                 aria-label="${escapeHtml(article.title)} illustration"></div>
            <h2 class="card__title">${escapeHtml(article.title)}</h2>
            <p class="card__meta">v${escapeHtml(article.version)} · ${escapeHtml(metaTags)}</p>
            <p class="card__body">${escapeHtml(buildExcerpt(article.content))}</p>
            <div class="card__footer">
                <span class="badge badge--tag">${escapeHtml(headerTag)}</span>
                <a class="btn btn--small btn--ghost"
                   href="article.html?slug=${hrefSlug}">Read →</a>
            </div>
        </article>
    `;
};

const renderError = (grid, message) => {
    grid.innerHTML = `
        <div class="alert alert--danger" role="alert">
            <span class="alert__icon" aria-hidden="true">!</span>
            <div>
                <p class="alert__title">Couldn't load articles</p>
                <p class="alert__body">${escapeHtml(message)}
                    — is the backend running on http://localhost:8001?</p>
            </div>
        </div>
    `;
};

const renderEmpty = (grid) => {
    grid.innerHTML = '<p class="page-home__empty">No articles yet. Seed the database first.</p>';
};

export const initHome = async () => {
    if (!isLocalEnvironment()) return;
    const grid = document.querySelector('[data-articles-grid]');
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    try {
        const articles = await apiGet('/articles');
        if (!Array.isArray(articles) || articles.length === 0) {
            renderEmpty(grid);
            return;
        }
        grid.innerHTML = articles.map(renderCard).join('');
    } catch (error) {
        renderError(grid, error.message || 'Network error');
    } finally {
        grid.removeAttribute('aria-busy');
    }
};
