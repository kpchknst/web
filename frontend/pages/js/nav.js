import { apiGet, isLocalEnvironment } from './api.js';
import {
    authHeader,
    clearSession,
    getToken,
    setSession,
} from './auth.js';

const findUserSlot = () => document.querySelector('[data-nav-user]');
const findLoginLink = () => document.querySelector('[data-nav-login]');

const renderLoggedOut = (slot, link) => {
    if (slot) {
        slot.hidden = true;
        slot.innerHTML = '';
    }
    if (link) link.hidden = false;
};

const renderLoggedIn = (slot, link, user) => {
    if (link) link.hidden = true;
    if (!slot) return;
    slot.hidden = false;
    slot.innerHTML = '';

    const badge = document.createElement('span');
    badge.className = `badge badge--role-${user.role}`;
    badge.textContent = user.role;

    const username = document.createElement('span');
    username.className = 'site-nav__username';
    username.textContent = user.username;

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'btn btn--secondary btn--small';
    logoutButton.textContent = 'Log out';
    logoutButton.addEventListener('click', () => {
        clearSession();
        window.location.href = 'index.html';
    });

    slot.append(badge, ' ', username, ' ', logoutButton);
};

export const initNav = async () => {
    const slot = findUserSlot();
    const link = findLoginLink();
    if (!getToken() || !isLocalEnvironment()) {
        renderLoggedOut(slot, link);
        return;
    }
    try {
        const me = await apiGet('/auth/me', authHeader());
        setSession({ token: getToken(), username: me.username, role: me.role });
        renderLoggedIn(slot, link, me);
    } catch (error) {
        if (error.status === 401) {
            clearSession();
        }
        renderLoggedOut(slot, link);
    }
};
