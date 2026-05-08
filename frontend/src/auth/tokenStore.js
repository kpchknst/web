const TOKEN_KEY = 'stones-scents.token';

export function getToken() {
    try {
        return window.localStorage.getItem(TOKEN_KEY);
    } catch (_) {
        return null;
    }
}

export function setToken(token) {
    try {
        window.localStorage.setItem(TOKEN_KEY, token);
    } catch (_) {
        // localStorage unavailable (private mode etc.) — token simply won't persist
    }
}

export function clearToken() {
    try {
        window.localStorage.removeItem(TOKEN_KEY);
    } catch (_) {
        // see setToken
    }
}
