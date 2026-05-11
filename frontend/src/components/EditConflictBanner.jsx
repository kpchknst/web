import { Link } from 'react-router-dom';
import Alert from './Alert.jsx';

export default function EditConflictBanner({
    pendingEdits,
    articleSlug,
    isAdmin,
}) {
    const count = pendingEdits ? pendingEdits.length : 0;
    if (count === 0) {
        return null;
    }

    const editorIds = Array.from(
        new Set(
            (pendingEdits || [])
                .map((edit) => edit.editor_id)
                .filter((id) => id !== undefined && id !== null),
        ),
    );

    const title = count === 1
        ? '1 pending edit on this article'
        : `${count} pending edits on this article`;

    return (
        <Alert variant="warning" title={title}>
            {isAdmin ? (
                <>
                    {`Article: ${articleSlug}. `}
                    <Link to="/moderation">Open moderation queue</Link>
                </>
            ) : (
                <>
                    {`This article has unapproved changes by ${editorIds.length} other editor(s). `}
                    Your proposal will be queued behind theirs.
                </>
            )}
        </Alert>
    );
}
