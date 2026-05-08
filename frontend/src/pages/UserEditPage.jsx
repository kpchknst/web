import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { getUser, updateUser } from '../api/users.js';
import useAuth from '../auth/useAuth.js';
import Alert from '../components/Alert.jsx';
import Spinner from '../components/Spinner.jsx';
import UserForm from '../components/UserForm.jsx';

function buildUpdatePayload(payload, originalUsername, isAdmin) {
    const next = {};
    if (payload.username && payload.username !== originalUsername) {
        next.username = payload.username;
    }
    if (payload.password) {
        next.password = payload.password;
    }
    if (isAdmin && payload.role) {
        next.role = payload.role;
    }
    return next;
}

export default function UserEditPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, refresh } = useAuth();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

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

    const isAdmin = currentUser?.role === 'admin';

    const handleSubmit = async (payload) => {
        setBusy(true);
        setError('');
        const update = buildUpdatePayload(payload, user.username, isAdmin);
        if (Object.keys(update).length === 0) {
            setError('Nothing to update — change a field first.');
            setBusy(false);
            return;
        }
        try {
            const updated = await updateUser(user.id, update);
            if (currentUser && currentUser.id === user.id) {
                await refresh();
            }
            navigate(`/users/${updated.id}`, { replace: true });
        } catch (caught) {
            setError(caught?.message || 'Could not save changes');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="page-user-form" aria-labelledby="edit-user-title">
            <div className="page-user-form__card">
                <p className="page-user-form__breadcrumb">
                    {isAdmin ? <Link to="/users">Users</Link> : <Link to="/">Home</Link>}
                    {' / '}
                    <Link to={`/users/${user.id}`}>{user.username}</Link>
                    {' / Edit'}
                </p>
                <h1 id="edit-user-title" className="page-user-form__title">Edit user</h1>

                {error && (
                    <Alert variant="danger" title="Couldn't save user">{error}</Alert>
                )}

                <UserForm
                    mode="edit"
                    initialValues={{ username: user.username, role: user.role }}
                    busy={busy}
                    submitLabel="Save changes"
                    onSubmit={handleSubmit}
                    onCancel={() => navigate(`/users/${user.id}`)}
                    canChangeRole={isAdmin}
                />
            </div>
        </section>
    );
}
