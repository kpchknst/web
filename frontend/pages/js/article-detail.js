import { apiGet, isLocalEnvironment } from './api.js';
import { escapeHtml, formatDate, splitParagraphs } from './dom.js';

const renderTags = (article) => (article.tags ?? [])
    .map((tag) => `<span class="badge badge--tag">${escapeHtml(tag.slug)}</span>`)
    .join(' ');

const renderBody = (article) => splitParagraphs(article.content)
    .map((para) => `<p>${escapeHtml(para)}</p>`)
    .join('');

const writeIntoPage = (article) => {
    const titleEl = document.querySelector('[data-article-title]');
    const metaEl = document.querySelector('[data-article-meta]');
    const bodyEl = document.querySelector('[data-article-body]');
    const tagsEl = document.querySelector('[data-article-tags]');
    const breadcrumbEl = document.querySelector('[data-article-breadcrumb]');
    const editLink = document.querySelector('[data-article-edit]');
    const updated = formatDate(article.updated_at);
    if (titleEl) titleEl.textContent = article.title;
    if (metaEl) metaEl.textContent = `Version ${article.version} · Updated ${updated}`;
    if (bodyEl) bodyEl.innerHTML = renderBody(article);
    if (tagsEl) tagsEl.innerHTML = renderTags(article);
    if (breadcrumbEl) breadcrumbEl.textContent = article.title;
    if (editLink) {
        editLink.href = `article-editor.html?slug=${encodeURIComponent(article.slug)}`;
    }
    document.title = `Stones & Scents — ${article.title}`;
};

const renderError = (host, message) => {
    if (!host) return;
    host.innerHTML = `
        <div class="alert alert--danger" role="alert">
            <span class="alert__icon" aria-hidden="true">!</span>
            <div>
                <p class="alert__title">Couldn't load this article</p>
                <p class="alert__body">${escapeHtml(message)}</p>
            </div>
        </div>
    `;
};

export const initArticle = async () => {
    if (!isLocalEnvironment()) return;
    const host = document.querySelector('[data-article-body]');
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'rose-quartz';
    try {
        const article = await apiGet(`/articles/${encodeURIComponent(slug)}`);
        writeIntoPage(article);
    } catch (error) {
        renderError(host, error.message || 'Network error');
    }
};
