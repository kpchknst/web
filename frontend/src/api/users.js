import client from './client.js';

export async function listUsers(query = '') {
    const params = query ? { q: query } : {};
    const { data } = await client.get('/users', { params });
    return data;
}

export async function getUser(userId) {
    const { data } = await client.get(`/users/${encodeURIComponent(userId)}`);
    return data;
}

export async function createUser(payload) {
    const { data } = await client.post('/users', payload);
    return data;
}

export async function updateUser(userId, payload) {
    const { data } = await client.put(`/users/${encodeURIComponent(userId)}`, payload);
    return data;
}

export async function deleteUser(userId) {
    await client.delete(`/users/${encodeURIComponent(userId)}`);
}
