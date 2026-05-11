import client from './client.js';

export async function createReading({ kind, stoneSlugs }) {
    const { data } = await client.post('/ai/readings', {
        kind,
        stone_slugs: stoneSlugs,
    });
    return data;
}

export async function listReadings(limit = 20) {
    const { data } = await client.get('/ai/readings', { params: { limit } });
    return data;
}
