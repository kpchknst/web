import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createUser } from '../api/users.js';
import Alert from '../components/Alert.jsx';
import UserForm from '../components/UserForm.jsx';

export default function UserCreatePage() {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (payload) => {
        setBusy(true);
        setError('');
        try {
            const created = await createUser(payload);
            navigate(`/users/${created.id}`, { replace: true });
        } catch (caught) {
            setError(caught?.message || 'Could not create user');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="page-user-form" aria-labelledby="create-user-title">
            <div className="page-user-form__card">
                <p className="page-user-form__breadcrumb">
                    <Link to="/users">Users</Link>
                    {' / Create user'}
                </p>
                <h1 id="create-user-title" className="page-user-form__title">Create user</h1>

                {error && (
                    <Alert variant="danger" title="Couldn't create user">{error}</Alert>
                )}

                <UserForm
                    mode="create"
                    busy={busy}
                    submitLabel="Create user"
                    onSubmit={handleSubmit}
                    onCancel={() => navigate('/users')}
                />
            </div>
        </section>
    );
}
