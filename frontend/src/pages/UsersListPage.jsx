import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { deleteUser, listUsers } from '../api/users.js';
import useAuth from '../auth/useAuth.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate } from '../utils/format.js';

function UserRow({
    user,
    currentUserId,
    onAskDelete,
}) {
    const initial = user.username.charAt(0).toUpperCase();
    const isSelf = user.id === currentUserId;
    return (
        <tr>
            <td data-label="Username">
                <span className="user-table__cell--name">
                    <span
                        className={`user-table__avatar user-table__avatar--${user.role}`}
                        aria-hidden="true"
                    >
                        {initial}
                    </span>
                    {user.username}
                </span>
            </td>
            <td data-label="Role">
                <Badge variant={`role-${user.role}`}>{user.role}</Badge>
            </td>
            <td data-label="Joined">{formatDate(user.created_at)}</td>
            <td data-label="Actions">
                <div className="user-table__actions">
                    <Link className="btn btn--ghost btn--small" to={`/users/${user.id}`}>
                        View
                    </Link>
                    <Link className="btn btn--secondary btn--small" to={`/users/${user.id}/edit`}>
                        Edit
                    </Link>
                    <button
                        type="button"
                        className="btn btn--danger btn--small"
                        onClick={() => onAskDelete(user)}
                        disabled={isSelf}
                        title={isSelf ? 'An admin cannot delete themselves' : undefined}
                    >
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}

export default function UsersListPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await listUsers();
                if (!cancelled) {
                    setUsers(Array.isArray(data) ? data : []);
                }
            } catch (caught) {
                if (!cancelled) {
                    setError(caught?.message || 'Network error');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }
        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        setDeleteBusy(true);
        try {
            await deleteUser(pendingDelete.id);
            setUsers((current) => current.filter((u) => u.id !== pendingDelete.id));
            setFeedback(`Deleted ${pendingDelete.username}.`);
            setPendingDelete(null);
        } catch (caught) {
            setError(caught?.message || 'Could not delete user');
        } finally {
            setDeleteBusy(false);
        }
    };

    return (
        <section className="page-users" aria-labelledby="users-title">
            <div className="page-users__header">
                <h1 id="users-title" className="page-users__title">Users</h1>
                <Link className="btn btn--primary" to="/users/new">+ New user</Link>
            </div>

            {feedback && (
                <Alert variant="success" title="Done">{feedback}</Alert>
            )}

            {error && (
                <Alert variant="danger" title="Couldn't load users">{error}</Alert>
            )}

            {loading && <Spinner label="Loading users…" />}

            {!loading && !error && users.length === 0 && (
                <Alert variant="info" title="No users yet">
                    Seed the database first.
                </Alert>
            )}

            {!loading && users.length > 0 && (
                <table className="user-table">
                    <thead>
                        <tr>
                            <th scope="col">Username</th>
                            <th scope="col">Role</th>
                            <th scope="col">Joined</th>
                            <th scope="col">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <UserRow
                                key={user.id}
                                user={user}
                                currentUserId={currentUser?.id}
                                onAskDelete={setPendingDelete}
                            />
                        ))}
                    </tbody>
                </table>
            )}

            <ConfirmModal
                open={Boolean(pendingDelete)}
                title="Delete user?"
                confirmLabel="Delete user"
                cancelLabel="Cancel"
                danger
                busy={deleteBusy}
                onCancel={() => setPendingDelete(null)}
                onConfirm={handleConfirmDelete}
            >
                {pendingDelete && (
                    <>
                        This will permanently delete
                        {' '}
                        <strong>{pendingDelete.username}</strong>
                        . This action cannot be undone.
                    </>
                )}
            </ConfirmModal>
        </section>
    );
}
