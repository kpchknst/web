import client from './client.js';

export async function listEdits(params = {}) {
    const { data } = await client.get('/edits', { params });
    return data;
}

export async function listMyEdits() {
    const { data } = await client.get('/me/edits');
    return data;
}

export async function getEdit(id) {
    const { data } = await client.get(`/edits/${encodeURIComponent(id)}`);
    return data;
}

export async function proposeEdit(slug, payload) {
    const { data } = await client.post(
        `/articles/${encodeURIComponent(slug)}/edits`,
        payload,
    );
    return data;
}

export async function approveEdit(id) {
    const { data } = await client.post(`/edits/${encodeURIComponent(id)}/approve`);
    return data;
}

export async function rejectEdit(id, reason) {
    const { data } = await client.post(
        `/edits/${encodeURIComponent(id)}/reject`,
        { reason },
    );
    return data;
}
