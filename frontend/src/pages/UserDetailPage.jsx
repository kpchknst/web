import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { deleteUser, getUser } from '../api/users.js';
import useAuth from '../auth/useAuth.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatDate } from '../utils/format.js';

export default function UserDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteBusy, setDeleteBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            setError('');
            try {
                const data = await getUser(id);
                if (!cancelled) {
                    setUser(data);
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
    }, [id]);

    if (loading) {
        return <Spinner label="Loading user…" />;
    }

    if (error) {
        return (
            <Alert variant="danger" title="Couldn't load user">{error}</Alert>
        );
    }

    if (!user) {
        return null;
    }

    const initial = user.username.charAt(0).toUpperCase();
    const isAdmin = currentUser?.role === 'admin';
    const isSelf = currentUser?.id === user.id;

    const handleDelete = async () => {
        setDeleteBusy(true);
        try {
            await deleteUser(user.id);
            navigate('/users', { replace: true });
        } catch (caught) {
            setError(caught?.message || 'Could not delete user');
            setDeleteBusy(false);
            setDeleteOpen(false);
        }
    };

    return (
        <div className="page-user-detail">
            <p className="page-user-form__breadcrumb">
                {isAdmin ? <Link to="/users">Users</Link> : <Link to="/">Home</Link>}
                {` / ${user.username}`}
            </p>

            <article
                className="page-user-detail__card"
                aria-labelledby="user-detail-title"
            >
                <div className="page-user-detail__header">
                    <div className="page-user-detail__avatar" aria-hidden="true">
                        {initial}
                    </div>
                    <div>
                        <h1 id="user-detail-title" className="page-user-detail__name">
                            {user.username}
                        </h1>
                        <Badge variant={`role-${user.role}`}>{user.role}</Badge>
                    </div>
                </div>

                <dl className="page-user-detail__info">
                    <dt>User ID</dt>
                    <dd><code>{user.id}</code></dd>

                    <dt>Joined</dt>
                    <dd>{formatDate(user.created_at)}</dd>

                    <dt>Role</dt>
                    <dd>{user.role}</dd>

                    <dt>Gender</dt>
                    <dd>{user.gender || '(unspecified)'}</dd>
                </dl>

                <div className="page-user-detail__actions">
                    <Link className="btn btn--secondary" to={`/users/${user.id}/edit`}>
                        Edit user
                    </Link>
                    {isAdmin && (
                        <Link className="btn btn--ghost" to="/users">
                            Back to listing
                        </Link>
                    )}
                    {isAdmin && !isSelf && (
                        <button
                            type="button"
                            className="btn btn--danger"
                            onClick={() => setDeleteOpen(true)}
                        >
                            Delete user
                        </button>
                    )}
                </div>
            </article>

            <ConfirmModal
                open={deleteOpen}
                title="Delete user?"
                confirmLabel="Delete user"
                cancelLabel="Cancel"
                danger
                busy={deleteBusy}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={handleDelete}
            >
                {`This will permanently delete ${user.username}. This action cannot be undone.`}
            </ConfirmModal>
        </div>
    );
}
