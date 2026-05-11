import client from './client.js';

export async function listArticles(params = {}) {
    const { data } = await client.get('/articles', { params });
    return data;
}

export async function getArticleBySlug(slug) {
    const { data } = await client.get(`/articles/${encodeURIComponent(slug)}`);
    return data;
}

export async function createArticle(payload) {
    const { data } = await client.post('/articles', payload);
    return data;
}

export async function updateArticle(slug, payload) {
    const { data } = await client.put(
        `/articles/${encodeURIComponent(slug)}`,
        payload,
    );
    return data;
}

export async function deleteArticle(slug) {
    await client.delete(`/articles/${encodeURIComponent(slug)}`);
}

export async function getArticleHistory(slug) {
    const { data } = await client.get(
        `/articles/${encodeURIComponent(slug)}/history`,
    );
    return data;
}
