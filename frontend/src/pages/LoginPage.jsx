import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../auth/useAuth.js';

const FALLBACK_REDIRECT = '/';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const targetPath = location.state?.from || FALLBACK_REDIRECT;

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        const trimmedUsername = username.trim();
        if (!trimmedUsername || !password) {
            setError('Both fields are required.');
            return;
        }
        setBusy(true);
        try {
            await login(trimmedUsername, password);
            navigate(targetPath, { replace: true });
        } catch (caught) {
            const message = caught?.status === 401
                ? 'Invalid username or password.'
                : caught?.message || 'Login failed. Is the backend running?';
            setError(message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="page-login" aria-labelledby="login-title">
            <div className="page-login__card">
                <h1 id="login-title" className="page-login__title">Welcome back</h1>
                <p className="page-login__subtitle">
                    Sign in to manage users or moderate the queue.
                </p>

                <form className="form" onSubmit={handleSubmit} noValidate>
                    {error && (
                        <p className="form-error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="form-field">
                        <label
                            className="form-field__label form-field__label--required"
                            htmlFor="login-username"
                        >
                            Username
                        </label>
                        <input
                            className="form-input"
                            id="login-username"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label
                            className="form-field__label form-field__label--required"
                            htmlFor="login-password"
                        >
                            Password
                        </label>
                        <input
                            className="form-input"
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <p className="form-field__hint">
                            Demo: admin / admin123 · regular / regular123
                        </p>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn--primary btn--block"
                            disabled={busy}
                        >
                            {busy ? 'Signing in…' : 'Log in'}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
