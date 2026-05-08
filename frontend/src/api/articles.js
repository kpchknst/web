import client from './client.js';

export async function listArticles() {
    const { data } = await client.get('/articles');
    return data;
}

export async function getArticleBySlug(slug) {
    const { data } = await client.get(`/articles/${encodeURIComponent(slug)}`);
    return data;
}
