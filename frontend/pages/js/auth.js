const TOKEN_KEY = 'stones-scents.token';
const ROLE_KEY = 'stones-scents.role';
const USERNAME_KEY = 'stones-scents.username';

export const getToken = () => window.localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => ({
    username: window.localStorage.getItem(USERNAME_KEY),
    role: window.localStorage.getItem(ROLE_KEY),
});

export const setSession = ({ token, username, role }) => {
    window.localStorage.setItem(TOKEN_KEY, token);
    window.localStorage.setItem(USERNAME_KEY, username);
    window.localStorage.setItem(ROLE_KEY, role);
};

export const clearSession = () => {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USERNAME_KEY);
    window.localStorage.removeItem(ROLE_KEY);
};

export const authHeader = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
};
