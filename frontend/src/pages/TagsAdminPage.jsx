import { useEffect, useRef, useState } from 'react';

import {
    createTag,
    deleteTag,
    listTags,
    updateTag,
} from '../api/tags.js';
import Alert from '../components/Alert.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import Spinner from '../components/Spinner.jsx';
import slugify from '../utils/slugify.js';

function pickError(exc, fallback) {
    return exc?.response?.data?.detail || exc?.message || fallback;
}

function TagRow({
    tag,
    editing,
    editingName,
    editingSlug,
    onChangeName,
    onChangeSlug,
    onStartEdit,
    onSave,
    onCancel,
    onAskDelete,
    busy,
}) {
    if (editing) {
        return (
            <div className="page-tags-admin__row">
                <input
                    className="form-input"
                    type="text"
                    value={editingName}
                    onChange={onChangeName}
                    aria-label={`Name for ${tag.name}`}
                    maxLength={50}
                />
                <input
                    className="form-input"
                    type="text"
                    value={editingSlug}
                    onChange={onChangeSlug}
                    aria-label={`Slug for ${tag.name}`}
                    maxLength={50}
                />
                <button
                    type="button"
                    className="btn btn--primary btn--small"
                    onClick={onSave}
                    disabled={busy}
                >
                    {busy ? 'Saving…' : 'Save'}
                </button>
                <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={onCancel}
                    disabled={busy}
                >
                    Cancel
                </button>
            </div>
        );
    }
    return (
        <div className="page-tags-admin__row">
            <span style={{ flex: 1 }}>
                <strong>{tag.name}</strong>
                {' '}
                <code>{tag.slug}</code>
            </span>
            <button
                type="button"
                className="btn btn--secondary btn--small"
                onClick={onStartEdit}
            >
                Edit
            </button>
            <button
                type="button"
                className="btn btn--danger btn--small"
                onClick={onAskDelete}
            >
                Delete
            </button>
        </div>
    );
}

export default function TagsAdminPage() {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [newName, setNewName] = useState('');
    const [newSlug, setNewSlug] = useState('');
    const newSlugTouched = useRef(false);
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingSlug, setEditingSlug] = useState('');
    const [rowBusy, setRowBusy] = useState(false);

    const [deleteOpenId, setDeleteOpenId] = useState(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const reload = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await listTags();
            setTags(Array.isArray(data) ? data : []);
        } catch (caught) {
            setError(pickError(caught, 'Could not load tags'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        reload();
    }, []);

    const handleNewName = (event) => {
        const next = event.target.value;
        setNewName(next);
        if (!newSlugTouched.current) {
            setNewSlug(slugify(next));
        }
    };

    const handleNewSlug = (event) => {
        newSlugTouched.current = true;
        setNewSlug(event.target.value);
    };

    const handleAdd = async (event) => {
        event.preventDefault();
        if (submitting) return;
        const name = newName.trim();
        const slug = newSlug.trim();
        if (!name || !slug) return;
        setSubmitting(true);
        setError('');
        try {
            await createTag({ name, slug });
            setNewName('');
            setNewSlug('');
            newSlugTouched.current = false;
            await reload();
        } catch (caught) {
            const status = caught?.response?.status;
            if (status === 409) {
                setError(`A tag with slug "${slug}" already exists.`);
            } else {
                setError(pickError(caught, 'Could not create tag'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    const startEdit = (tag) => {
        setEditingId(tag.id);
        setEditingName(tag.name);
        setEditingSlug(tag.slug);
        setError('');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingName('');
        setEditingSlug('');
    };

    const saveEdit = async () => {
        if (!editingId) return;
        const name = editingName.trim();
        const slug = editingSlug.trim();
        if (!name || !slug) return;
        setRowBusy(true);
        setError('');
        try {
            await updateTag(editingId, { name, slug });
            cancelEdit();
            await reload();
        } catch (caught) {
            const status = caught?.response?.status;
            if (status === 409) {
                setError(`A tag with slug "${slug}" already exists.`);
            } else {
                setError(pickError(caught, 'Could not update tag'));
            }
        } finally {
            setRowBusy(false);
        }
    };

    const confirmDelete = async () => {
        if (!deleteOpenId) return;
        setDeleteBusy(true);
        setError('');
        try {
            await deleteTag(deleteOpenId);
            setDeleteOpenId(null);
            await reload();
        } catch (caught) {
            setError(pickError(caught, 'Could not delete tag'));
        } finally {
            setDeleteBusy(false);
        }
    };

    const pendingDelete = tags.find((t) => t.id === deleteOpenId) || null;
    const canAdd = newName.trim().length > 0
        && newSlug.trim().length > 0
        && !submitting;

    return (
        <section className="page-tags-admin" aria-labelledby="tags-admin-title">
            <h1 id="tags-admin-title" className="page-user-form__title">Tags</h1>

            {error && (
                <Alert variant="danger" title="Tags">{error}</Alert>
            )}

            <form className="form" onSubmit={handleAdd} noValidate>
                <div className="form-field">
                    <label className="form-field__label" htmlFor="tags-admin-new-name">
                        New tag name
                    </label>
                    <input
                        id="tags-admin-new-name"
                        className="form-input"
                        type="text"
                        value={newName}
                        onChange={handleNewName}
                        maxLength={50}
                    />
                </div>
                <div className="form-field">
                    <label className="form-field__label" htmlFor="tags-admin-new-slug">
                        Slug
                    </label>
                    <input
                        id="tags-admin-new-slug"
                        className="form-input"
                        type="text"
                        value={newSlug}
                        onChange={handleNewSlug}
                        maxLength={50}
                        pattern="[a-z0-9-]+"
                    />
                </div>
                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={!canAdd}
                    >
                        {submitting ? 'Adding…' : 'Add tag'}
                    </button>
                </div>
            </form>

            {loading && <Spinner label="Loading tags…" />}

            {!loading && tags.length === 0 && (
                <Alert variant="info" title="No tags yet">
                    Add your first tag using the form above.
                </Alert>
            )}

            {!loading && tags.map((tag) => (
                <TagRow
                    key={tag.id}
                    tag={tag}
                    editing={editingId === tag.id}
                    editingName={editingName}
                    editingSlug={editingSlug}
                    onChangeName={(event) => setEditingName(event.target.value)}
                    onChangeSlug={(event) => setEditingSlug(event.target.value)}
                    onStartEdit={() => startEdit(tag)}
                    onSave={saveEdit}
                    onCancel={cancelEdit}
                    onAskDelete={() => setDeleteOpenId(tag.id)}
                    busy={rowBusy && editingId === tag.id}
                />
            ))}

            <ConfirmModal
                open={Boolean(deleteOpenId)}
                title="Delete tag?"
                confirmLabel="Delete tag"
                cancelLabel="Cancel"
                danger
                busy={deleteBusy}
                onCancel={() => setDeleteOpenId(null)}
                onConfirm={confirmDelete}
            >
                {pendingDelete
                    ? `Delete tag "${pendingDelete.name}"? This cannot be undone.`
                    : ''}
            </ConfirmModal>
        </section>
    );
}
