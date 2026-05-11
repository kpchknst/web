import { http, HttpResponse } from 'msw';

import { articles as articlesFixture } from './fixtures/articles.js';
import { edits as editsFixture } from './fixtures/edits.js';
import { tags as tagsFixture } from './fixtures/tags.js';
import { users as usersFixture } from './fixtures/users.js';

const API = '/api';

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function filterArticles(list, params) {
    const q = (params.get('q') || '').trim().toLowerCase();
    const tagSlug = (params.get('tag') || '').trim().toLowerCase();
    return list.filter((article) => {
        if (q) {
            const title = (article.title || '').toLowerCase();
            const content = (article.content || '').toLowerCase();
            if (!title.includes(q) && !content.includes(q)) {
                return false;
            }
        }
        if (tagSlug) {
            const slugs = (article.tags || []).map((t) => t.slug);
            if (!slugs.includes(tagSlug)) {
                return false;
            }
        }
        return true;
    });
}

function findArticleBySlug(slug) {
    return articlesFixture.find((article) => article.slug === slug);
}

function nowIso() {
    return new Date().toISOString();
}

export const handlers = [
    http.get(`${API}/articles`, ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json(clone(filterArticles(articlesFixture, url.searchParams)));
    }),
    http.get(`${API}/articles/:slug`, ({ params }) => {
        const article = findArticleBySlug(params.slug);
        if (!article) {
            return HttpResponse.json({ detail: 'Article not found' }, { status: 404 });
        }
        return HttpResponse.json(clone(article));
    }),
    http.get(`${API}/articles/:slug/history`, ({ params }) => {
        const article = findArticleBySlug(params.slug);
        if (!article) {
            return HttpResponse.json({ detail: 'Article not found' }, { status: 404 });
        }
        return HttpResponse.json([]);
    }),
    http.post(`${API}/articles`, async ({ request }) => {
        const body = await request.json();
        const created = {
            id: 'a-new-001',
            slug: body.slug || 'new-article',
            title: body.title || 'New article',
            content: body.content || '',
            cover_image_url: body.cover_image_url || null,
            author_id: body.author_id || 'u-admin-001',
            version: 1,
            created_at: nowIso(),
            updated_at: nowIso(),
            tags: body.tags || [],
        };
        return HttpResponse.json(created, { status: 201 });
    }),
    http.put(`${API}/articles/:slug`, async ({ params, request }) => {
        const existing = findArticleBySlug(params.slug);
        if (!existing) {
            return HttpResponse.json({ detail: 'Article not found' }, { status: 404 });
        }
        const body = await request.json();
        const updated = {
            ...clone(existing),
            ...body,
            slug: existing.slug,
            version: (existing.version || 1) + 1,
            updated_at: nowIso(),
        };
        return HttpResponse.json(updated);
    }),
    http.delete(`${API}/articles/:slug`, ({ params }) => {
        const existing = findArticleBySlug(params.slug);
        if (!existing) {
            return HttpResponse.json({ detail: 'Article not found' }, { status: 404 });
        }
        return new HttpResponse(null, { status: 204 });
    }),

    http.get(`${API}/users`, ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        const list = q
            ? usersFixture.filter((user) => (user.username || '').toLowerCase().includes(q))
            : usersFixture;
        return HttpResponse.json(clone(list));
    }),
    http.get(`${API}/users/:id`, ({ params }) => {
        const user = usersFixture.find((u) => u.id === params.id);
        if (!user) {
            return HttpResponse.json({ detail: 'User not found' }, { status: 404 });
        }
        return HttpResponse.json(clone(user));
    }),

    http.post(`${API}/auth/login`, async ({ request }) => {
        const body = await request.json();
        if (body.username === 'admin' && body.password === 'admin123') {
            return HttpResponse.json({ access_token: 'mock-jwt', token_type: 'bearer' });
        }
        return HttpResponse.json({ detail: 'Invalid credentials' }, { status: 401 });
    }),
    http.get(`${API}/auth/me`, () => {
        const admin = usersFixture.find((u) => u.role === 'admin');
        return HttpResponse.json(clone(admin));
    }),
    http.post(`${API}/auth/register`, async ({ request }) => {
        const body = await request.json();
        const created = {
            id: `u-new-${body.username}`,
            username: body.username,
            role: 'regular',
            gender: body.gender || 'prefer_not_to_say',
            created_at: nowIso(),
        };
        return HttpResponse.json(created, { status: 201 });
    }),

    http.get(`${API}/tags`, () => HttpResponse.json(clone(tagsFixture))),
    http.post(`${API}/tags`, async ({ request }) => {
        const body = await request.json();
        const created = {
            id: `t-new-${body.name || 'tag'}`,
            name: body.name || 'tag',
            slug: body.slug || (body.name || 'tag').toLowerCase().replace(/\s+/g, '-'),
        };
        return HttpResponse.json(created, { status: 201 });
    }),
    http.put(`${API}/tags/:id`, async ({ params, request }) => {
        const existing = tagsFixture.find((t) => t.id === params.id);
        if (!existing) {
            return HttpResponse.json({ detail: 'Tag not found' }, { status: 404 });
        }
        const body = await request.json();
        return HttpResponse.json({ ...clone(existing), ...body, id: existing.id });
    }),
    http.delete(`${API}/tags/:id`, ({ params }) => {
        const existing = tagsFixture.find((t) => t.id === params.id);
        if (!existing) {
            return HttpResponse.json({ detail: 'Tag not found' }, { status: 404 });
        }
        return new HttpResponse(null, { status: 204 });
    }),

    http.get(`${API}/edits`, ({ request }) => {
        const url = new URL(request.url);
        const status = url.searchParams.get('status');
        const articleSlug = url.searchParams.get('article_slug');
        let list = clone(editsFixture);
        if (status) {
            list = list.filter((edit) => edit.status === status);
        }
        if (articleSlug) {
            const article = findArticleBySlug(articleSlug);
            const articleId = article ? article.id : null;
            list = list.filter((edit) => edit.article_id === articleId);
        }
        return HttpResponse.json(list);
    }),
    http.get(`${API}/me/edits`, () => {
        const list = editsFixture.filter((edit) => edit.editor_id === 'u-regular-001');
        return HttpResponse.json(clone(list));
    }),
    http.get(`${API}/edits/:id`, ({ params }) => {
        const edit = editsFixture.find((e) => e.id === params.id);
        if (!edit) {
            return HttpResponse.json({ detail: 'Edit not found' }, { status: 404 });
        }
        return HttpResponse.json(clone(edit));
    }),
    http.post(`${API}/articles/:slug/edits`, async ({ params, request }) => {
        const article = findArticleBySlug(params.slug);
        if (!article) {
            return HttpResponse.json({ detail: 'Article not found' }, { status: 404 });
        }
        const body = await request.json();
        const created = {
            id: `e-new-${article.id}`,
            article_id: article.id,
            editor_id: 'u-regular-001',
            proposed_title: body.proposed_title || article.title,
            proposed_content: body.proposed_content || article.content,
            base_version: body.base_version || article.version,
            status: 'pending',
            submitted_at: nowIso(),
            reviewed_at: null,
            reviewer_id: null,
            rejection_reason: null,
        };
        return HttpResponse.json(created, { status: 201 });
    }),
    http.post(`${API}/edits/:id/approve`, ({ params }) => {
        const edit = editsFixture.find((e) => e.id === params.id);
        if (!edit) {
            return HttpResponse.json({ detail: 'Edit not found' }, { status: 404 });
        }
        return HttpResponse.json({
            ...clone(edit),
            status: 'approved',
            reviewed_at: nowIso(),
            reviewer_id: 'u-admin-001',
            rejection_reason: null,
        });
    }),
    http.post(`${API}/edits/:id/reject`, async ({ params, request }) => {
        const edit = editsFixture.find((e) => e.id === params.id);
        if (!edit) {
            return HttpResponse.json({ detail: 'Edit not found' }, { status: 404 });
        }
        const body = await request.json();
        return HttpResponse.json({
            ...clone(edit),
            status: 'rejected',
            reviewed_at: nowIso(),
            reviewer_id: 'u-admin-001',
            rejection_reason: body.reason || 'Rejected.',
        });
    }),

    http.post(`${API}/uploads`, () => HttpResponse.json({ url: '/uploads/mock-upload.jpg' })),
];

export default handlers;
