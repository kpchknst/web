import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { register as registerUser } from '../api/auth.js';
import useAuth from '../auth/useAuth.js';

export default function RegisterPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [gender, setGender] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        const trimmed = username.trim();
        if (trimmed.length < 3 || trimmed.length > 50) {
            setError('Username must be 3 to 50 characters.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setBusy(true);
        try {
            await registerUser({ username: trimmed, password, gender: gender || undefined });
            await login(trimmed, password);
            navigate('/', { replace: true });
        } catch (caught) {
            const message = caught?.status === 409
                ? 'That username is already taken.'
                : caught?.message || 'Could not create the account.';
            setError(message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="page-login" aria-labelledby="register-title">
            <div className="page-login__card">
                <h1 id="register-title" className="page-login__title">Create your account</h1>
                <p className="page-login__subtitle">
                    Sign up to read stones and generate your perfume &amp; personality
                    readings.
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
                            htmlFor="register-username"
                        >
                            Username
                        </label>
                        <input
                            className="form-input"
                            id="register-username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            minLength={3}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label
                            className="form-field__label form-field__label--required"
                            htmlFor="register-password"
                        >
                            Password
                        </label>
                        <input
                            className="form-input"
                            id="register-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />
                        <p className="form-field__hint">At least 6 characters.</p>
                    </div>

                    <div className="form-field">
                        <label
                            className="form-field__label form-field__label--required"
                            htmlFor="register-confirm"
                        >
                            Confirm password
                        </label>
                        <input
                            className="form-input"
                            id="register-confirm"
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            minLength={6}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-field__label" htmlFor="register-gender">
                            Gender
                        </label>
                        <select
                            className="form-select"
                            id="register-gender"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                        >
                            <option value="">(unspecified)</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="prefer_not_to_say">Prefer not to say</option>
                        </select>
                        <p className="form-field__hint">
                            Optional — used to tailor your perfume suggestions. Pick
                            {' '}
                            <em>Prefer not to say</em>
                            {' '}
                            for unisex picks.
                        </p>
                    </div>

                    <div className="form-actions">
                        <button
                            type="submit"
                            className="btn btn--primary btn--block"
                            disabled={busy}
                        >
                            {busy ? 'Creating account…' : 'Sign up'}
                        </button>
                    </div>

                    <p className="page-login__alt">
                        Already have an account?
                        {' '}
                        <Link to="/login">Log in</Link>
                        .
                    </p>
                </form>
            </div>
        </section>
    );
}
