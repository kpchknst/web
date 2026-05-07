import { initNav } from './nav.js';

const PAGE_LOADERS = {
    home: () => import('./articles-list.js').then((mod) => mod.initHome()),
    article: () => import('./article-detail.js').then((mod) => mod.initArticle()),
    login: () => import('./login.js').then((mod) => mod.initLogin()),
    users: () => import('./users-list.js').then((mod) => mod.initUsers()),
};

const run = async () => {
    await initNav();
    const { page } = document.body.dataset;
    const loader = PAGE_LOADERS[page];
    if (loader) await loader();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { run(); });
} else {
    run();
}
