import { useState } from 'react';

const INITIAL_DRAFT = {
    username: '',
    password: '',
    confirm: '',
    role: 'regular',
    gender: '',
};

const VALID_GENDERS = ['', 'female', 'male', 'prefer_not_to_say'];

function buildInitialDraft(initialValues) {
    return {
        ...INITIAL_DRAFT,
        ...(initialValues || {}),
        gender: (initialValues && initialValues.gender) || '',
        password: '',
        confirm: '',
    };
}

function validate(draft, mode) {
    const errors = {};
    const username = draft.username.trim();
    if (username.length < 3 || username.length > 50) {
        errors.username = 'Username must be 3 to 50 characters.';
    }
    if (mode === 'create' || draft.password) {
        if (draft.password.length < 6) {
            errors.password = 'Password must be at least 6 characters.';
        }
        if (draft.password !== draft.confirm) {
            errors.confirm = 'Passwords do not match.';
        }
    }
    if (!['regular', 'admin'].includes(draft.role)) {
        errors.role = 'Pick a role.';
    }
    if (!VALID_GENDERS.includes(draft.gender)) {
        errors.gender = 'Pick a gender option.';
    }
    return errors;
}

function buildSubmitPayload(draft, mode) {
    const payload = {
        username: draft.username.trim(),
        role: draft.role,
    };
    if (mode === 'create' || draft.password) {
        payload.password = draft.password;
    }
    if (draft.gender) {
        payload.gender = draft.gender;
    } else if (mode === 'edit') {
        payload.gender = null;
    }
    return payload;
}

export default function UserForm({
    mode,
    initialValues = null,
    busy = false,
    submitLabel,
    onSubmit,
    onCancel,
    canChangeRole = true,
}) {
    const [draft, setDraft] = useState(() => buildInitialDraft(initialValues));
    const [errors, setErrors] = useState({});

    const handleChange = (field) => (event) => {
        const { value } = event.target;
        setDraft((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        const nextErrors = validate(draft, mode);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }
        onSubmit(buildSubmitPayload(draft, mode));
    };

    const passwordHintForEdit = mode === 'edit'
        ? 'Leave blank to keep the existing password.'
        : 'At least 6 characters.';

    return (
        <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="form-field">
                <label
                    className="form-field__label form-field__label--required"
                    htmlFor="user-form-username"
                >
                    Username
                </label>
                <input
                    className={errors.username ? 'form-input form-input--invalid' : 'form-input'}
                    id="user-form-username"
                    type="text"
                    value={draft.username}
                    onChange={handleChange('username')}
                    minLength={3}
                    maxLength={50}
                    autoComplete="username"
                    required
                />
                {errors.username && <p className="form-field__error">{errors.username}</p>}
            </div>

            <div className="form-field">
                <label
                    className={`form-field__label${mode === 'create' ? ' form-field__label--required' : ''}`}
                    htmlFor="user-form-password"
                >
                    {mode === 'create' ? 'Password' : 'New password'}
                </label>
                <input
                    className={errors.password ? 'form-input form-input--invalid' : 'form-input'}
                    id="user-form-password"
                    type="password"
                    value={draft.password}
                    onChange={handleChange('password')}
                    minLength={mode === 'create' ? 6 : 0}
                    autoComplete="new-password"
                    placeholder={mode === 'edit' ? 'leave blank to keep current' : ''}
                />
                <p className="form-field__hint">{passwordHintForEdit}</p>
                {errors.password && <p className="form-field__error">{errors.password}</p>}
            </div>

            <div className="form-field">
                <label
                    className={`form-field__label${mode === 'create' ? ' form-field__label--required' : ''}`}
                    htmlFor="user-form-confirm"
                >
                    Confirm password
                </label>
                <input
                    className={errors.confirm ? 'form-input form-input--invalid' : 'form-input'}
                    id="user-form-confirm"
                    type="password"
                    value={draft.confirm}
                    onChange={handleChange('confirm')}
                    minLength={mode === 'create' ? 6 : 0}
                    autoComplete="new-password"
                    placeholder={mode === 'edit' ? 'must match the new password' : ''}
                />
                {errors.confirm && <p className="form-field__error">{errors.confirm}</p>}
            </div>

            <div className="form-field">
                <label className="form-field__label" htmlFor="user-form-role">Role</label>
                <select
                    className="form-select"
                    id="user-form-role"
                    value={draft.role}
                    onChange={handleChange('role')}
                    disabled={!canChangeRole}
                >
                    <option value="regular">regular</option>
                    <option value="admin">admin</option>
                </select>
                {!canChangeRole && (
                    <p className="form-field__hint">
                        Only an admin can change another user&apos;s role.
                    </p>
                )}
            </div>

            <div className="form-field">
                <label className="form-field__label" htmlFor="user-form-gender">Gender</label>
                <select
                    className="form-select"
                    id="user-form-gender"
                    value={draft.gender}
                    onChange={handleChange('gender')}
                >
                    <option value="">(unspecified)</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
                <p className="form-field__hint">
                    Optional — used to tailor perfume suggestions in the
                    {' '}
                    <em>My reading</em>
                    {' '}
                    page.
                </p>
                {errors.gender && <p className="form-field__error">{errors.gender}</p>}
            </div>

            <div className="form-actions">
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={onCancel}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={busy}>
                    {busy ? 'Saving…' : submitLabel}
                </button>
            </div>
        </form>
    );
}
