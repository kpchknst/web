import client from './client.js';

export async function uploadCover(file) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await client.post('/uploads', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
}
