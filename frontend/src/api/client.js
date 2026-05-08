import axios from 'axios';

import { clearToken, getToken } from '../auth/tokenStore.js';

const DEFAULT_BASE_URL = '/api';

function readOverride() {
    try {
        return window.localStorage.getItem('apiBase');
    } catch (_) {
        return null;
    }
}

function normaliseError(error) {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    let message = error?.message || 'Request failed';
    if (typeof detail === 'string' && detail) {
        message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
        message = detail
            .map((item) => item.msg || item.message || JSON.stringify(item))
            .join('; ');
    }
    const wrapped = new Error(message);
    wrapped.status = status;
    wrapped.cause = error;
    return wrapped;
}

const baseURL = readOverride() || DEFAULT_BASE_URL;

const client = axios.create({
    baseURL,
    headers: { Accept: 'application/json' },
    timeout: 15000,
});

client.interceptors.request.use((config) => {
    const token = getToken();
    if (!token) {
        return config;
    }
    return {
        ...config,
        headers: {
            ...(config.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    };
});

client.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 401) {
            clearToken();
        }
        return Promise.reject(normaliseError(error));
    },
);

export default client;
