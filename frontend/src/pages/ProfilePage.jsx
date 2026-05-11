import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { listArticles } from '../api/articles.js';
import { listMyEdits } from '../api/edits.js';
import { listReadings } from '../api/readings.js';
import useAuth from '../auth/useAuth.js';
import Alert from '../components/Alert.jsx';
import Badge from '../components/Badge.jsx';
import EditCard from '../components/EditCard.jsx';
import ReadingResult from '../components/ReadingResult.jsx';
import Spinner from '../components/Spinner.jsx';

const STATUS_SECTIONS = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'stale', label: 'Stale' },
];

function buildArticlesById(articles) {
    const map = {};
    (articles || []).forEach((article) => {
        map[article.id] = article;
    });
    return map;
}

function groupEditsByStatus(edits, articlesById) {
    const groups = {
        pending: [], approved: [], rejected: [], stale: [],
    };
    (edits || []).forEach((edit) => {
        const article = articlesById[edit.article_id];
        const isStale = edit.status === 'pending'
            && article
            && edit.base_version < article.version;
        if (isStale) {
            groups.stale.push(edit);
        } else if (groups[edit.status]) {
            groups[edit.status].push(edit);
        }
    });
    return groups;
}

function EditsSection({ groups, articlesById, onOpen }) {
    const total = STATUS_SECTIONS.reduce(
        (sum, { key }) => sum + groups[key].length,
        0,
    );
    if (total === 0) {
        return (
            <Alert variant="info" title="No edits yet">
                You haven&apos;t proposed any edits.
            </Alert>
        );
    }
    return (
        <div className="page-profile__edits">
            {STATUS_SECTIONS.map(({ key, label }) => {
                const items = groups[key];
                if (items.length === 0) return null;
                return (
                    <section key={key} aria-label={`${label} edits`}>
                        <h3 className="edit-card__title">
                            {`${label} (${items.length})`}
                        </h3>
                        {items.map((edit) => (
                            <EditCard
                                key={edit.id}
                                edit={edit}
                                articleVersion={articlesById[edit.article_id]?.version}
                                onClick={() => onOpen(edit)}
                            />
                        ))}
                    </section>
                );
            })}
        </div>
    );
}

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [readings, setReadings] = useState([]);
    const [readingsLoading, setReadingsLoading] = useState(true);
    const [edits, setEdits] = useState([]);
    const [articlesById, setArticlesById] = useState({});
    const [editsLoading, setEditsLoading] = useState(true);
    const [editsError, setEditsError] = useState('');

    useEffect(() => {
        let cancelled = false;
        async function loadReadings() {
            setReadingsLoading(true);
            try {
                const data = await listReadings();
                if (!cancelled) {
                    setReadings(Array.isArray(data) ? data : []);
                }
            } catch (_) {
                if (!cancelled) setReadings([]);
            } finally {
                if (!cancelled) setReadingsLoading(false);
            }
        }
        loadReadings();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        async function loadEdits() {
            setEditsLoading(true);
            setEditsError('');
            try {
                const [editList, articleList] = await Promise.all([
                    listMyEdits(),
                    listArticles(),
                ]);
                if (!cancelled) {
                    setEdits(Array.isArray(editList) ? editList : []);
                    setArticlesById(buildArticlesById(articleList));
                }
            } catch (caught) {
                if (!cancelled) {
                    setEditsError(caught?.message || 'Could not load edits');
                }
            } finally {
                if (!cancelled) setEditsLoading(false);
            }
        }
        loadEdits();
        return () => {
            cancelled = true;
        };
    }, []);

    if (!user) {
        return null;
    }

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleOpenEdit = (edit) => {
        const article = articlesById[edit.article_id];
        if (article?.slug) {
            navigate(`/articles/${article.slug}/history`);
        }
    };

    const groups = groupEditsByStatus(edits, articlesById);

    return (
        <div className="page-profile">
            <h1 className="page-user-detail__name">{`Hi, ${user.username}`}</h1>

            <section className="page-profile__group" aria-labelledby="profile-account">
                <h2 id="profile-account" className="page-user-detail__name">Account</h2>
                <dl className="page-user-detail__info">
                    <dt>Username</dt>
                    <dd>{user.username}</dd>
                    <dt>Role</dt>
                    <dd><Badge variant={`role-${user.role}`}>{user.role}</Badge></dd>
                    <dt>Gender</dt>
                    <dd>{user.gender || '(unspecified)'}</dd>
                </dl>
                <div className="page-user-detail__actions">
                    <Link className="btn btn--secondary" to={`/users/${user.id}/edit`}>
                        Edit account
                    </Link>
                    <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={handleLogout}
                    >
                        Log out
                    </button>
                </div>
            </section>

            <section className="page-profile__group" aria-labelledby="profile-readings">
                <h2 id="profile-readings" className="page-user-detail__name">My readings</h2>
                {readingsLoading && <Spinner label="Loading readings…" />}
                {!readingsLoading && readings.length === 0 && (
                    <Alert variant="info" title="No readings yet">
                        Generate one on the
                        {' '}
                        <Link to="/my-reading">My reading</Link>
                        {' '}
                        page.
                    </Alert>
                )}
                {!readingsLoading && readings.map((r) => (
                    <ReadingResult key={r.id} reading={r} />
                ))}
            </section>

            <section className="page-profile__group" aria-labelledby="profile-edits">
                <h2 id="profile-edits" className="page-user-detail__name">My edits</h2>
                {editsError && (
                    <Alert variant="danger" title="Couldn't load edits">{editsError}</Alert>
                )}
                {editsLoading && <Spinner label="Loading edits…" />}
                {!editsLoading && !editsError && (
                    <EditsSection
                        groups={groups}
                        articlesById={articlesById}
                        onOpen={handleOpenEdit}
                    />
                )}
            </section>
        </div>
    );
}
