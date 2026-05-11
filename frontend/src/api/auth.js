import client from './client.js';

export async function login(username, password) {
    const { data } = await client.post('/auth/login', { username, password });
    return data;
}

export async function register({ username, password, gender }) {
    const payload = { username, password };
    if (gender) {
        payload.gender = gender;
    }
    const { data } = await client.post('/auth/register', payload);
    return data;
}

export async function fetchMe() {
    const { data } = await client.get('/auth/me');
    return data;
}
