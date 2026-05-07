import { apiGet, isLocalEnvironment } from './api.js';
import { authHeader, getToken } from './auth.js';
import { escapeHtml, formatDate } from './dom.js';

const renderRow = (user) => {
    const initial = user.username.charAt(0).toUpperCase();
    const role = escapeHtml(user.role);
    return `
        <tr>
            <td data-label="Username">
                <span class="user-table__cell--name">
                    <span class="user-table__avatar user-table__avatar--${role}"
                          aria-hidden="true">${escapeHtml(initial)}</span>
                    ${escapeHtml(user.username)}
                </span>
            </td>
            <td data-label="Role">
                <span class="badge badge--role-${role}">${role}</span>
            </td>
            <td data-label="Joined">${escapeHtml(formatDate(user.created_at))}</td>
            <td data-label="Actions">
                <div class="user-table__actions">
                    <a class="btn btn--ghost btn--small"
                       href="user-detail.html?id=${encodeURIComponent(user.id)}">View</a>
                    <a class="btn btn--secondary btn--small"
                       href="user-edit.html?id=${encodeURIComponent(user.id)}">Edit</a>
                </div>
            </td>
        </tr>
    `;
};

const renderUnauthorised = (alertHost) => {
    if (!alertHost) return;
    alertHost.hidden = false;
    alertHost.className = 'alert alert--info';
    alertHost.innerHTML = `
        <span class="alert__icon" aria-hidden="true">i</span>
        <div>
            <p class="alert__title">Log in as admin to see users</p>
            <p class="alert__body">The user listing is admin-only.
                Use admin / admin123 on the login page.</p>
        </div>
    `;
};

const renderError = (alertHost, message) => {
    if (!alertHost) return;
    alertHost.hidden = false;
    alertHost.className = 'alert alert--danger';
    alertHost.innerHTML = `
        <span class="alert__icon" aria-hidden="true">!</span>
        <div>
            <p class="alert__title">Couldn't load users</p>
            <p class="alert__body">${escapeHtml(message)}</p>
        </div>
    `;
};

export const initUsers = async () => {
    if (!isLocalEnvironment()) return;
    const tbody = document.querySelector('[data-users-tbody]');
    const alertHost = document.querySelector('[data-users-alert]');
    if (!getToken()) {
        renderUnauthorised(alertHost);
        if (tbody) tbody.innerHTML = '';
        return;
    }
    try {
        const users = await apiGet('/users', authHeader());
        if (tbody) tbody.innerHTML = users.map(renderRow).join('');
    } catch (error) {
        const message = error.status === 403
            ? 'Your account is not an admin — log out and back in as admin.'
            : (error.message || 'Network error');
        renderError(alertHost, message);
        if (tbody) tbody.innerHTML = '';
    }
};
