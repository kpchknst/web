import client from './client.js';

export async function listTags() {
    const { data } = await client.get('/tags');
    return data;
}

export async function createTag(payload) {
    const { data } = await client.post('/tags', payload);
    return data;
}

export async function updateTag(id, payload) {
    const { data } = await client.put(`/tags/${encodeURIComponent(id)}`, payload);
    return data;
}

export async function deleteTag(id) {
    await client.delete(`/tags/${encodeURIComponent(id)}`);
}
