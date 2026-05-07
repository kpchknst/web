const API_BASE_DEFAULT = 'http://localhost:8001';

const readOverride = () => {
    try {
        return window.localStorage.getItem('apiBase');
    } catch (_) {
        return null;
    }
};

const API_BASE = readOverride() || API_BASE_DEFAULT;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '']);

export const isLocalEnvironment = () => LOCAL_HOSTS.has(window.location.hostname);

const buildUrl = (path) => {
    const prefix = path.startsWith('/') ? '' : '/';
    return `${API_BASE}${prefix}${path}`;
};

const parseJson = async (response) => {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch (cause) {
        const error = new Error('Server returned a malformed JSON response');
        error.cause = cause;
        throw error;
    }
};

const formatDetail = (detail, status) => {
    if (typeof detail === 'string' && detail) return detail;
    if (Array.isArray(detail) && detail.length > 0) {
        return detail
            .map((item) => item.msg || item.message || JSON.stringify(item))
            .join('; ');
    }
    return `Request failed with status ${status}`;
};

export const apiRequest = async (path, options = {}) => {
    const headers = { Accept: 'application/json', ...(options.headers ?? {}) };
    if (options.body !== undefined && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(buildUrl(path), { ...options, headers });
    const body = await parseJson(response);
    if (!response.ok) {
        const rawDetail = body && (body.detail ?? body.message);
        const message = formatDetail(rawDetail, response.status);
        const error = new Error(message);
        error.status = response.status;
        throw error;
    }
    return body;
};

export const apiGet = (path, headers) => apiRequest(path, { method: 'GET', headers });

export const apiPost = (path, payload, headers) => apiRequest(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
});

export { API_BASE };
