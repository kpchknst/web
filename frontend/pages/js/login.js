import { apiPost } from './api.js';
import { setSession } from './auth.js';

const showError = (host, message) => {
    if (!host) return;
    host.hidden = false;
    host.textContent = message;
};

const hideError = (host) => {
    if (!host) return;
    host.hidden = true;
    host.textContent = '';
};

export const initLogin = () => {
    const form = document.querySelector('[data-login-form]');
    if (!form) return;
    const errorHost = document.querySelector('[data-login-error]');
    const submitButton = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        hideError(errorHost);
        const data = new FormData(form);
        const username = String(data.get('username') ?? '').trim();
        const password = String(data.get('password') ?? '');
        if (!username || !password) {
            showError(errorHost, 'Both fields are required.');
            return;
        }
        if (submitButton) submitButton.disabled = true;
        try {
            const response = await apiPost('/auth/login', { username, password });
            setSession({
                token: response.access_token,
                username,
                role: response.role ?? 'regular',
            });
            window.location.href = 'index.html';
        } catch (error) {
            const message = error.status === 401
                ? 'Invalid username or password.'
                : (error.message || 'Login failed. Is the backend running?');
            showError(errorHost, message);
            if (submitButton) submitButton.disabled = false;
        }
    });
};
