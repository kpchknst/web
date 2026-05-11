import Badge from './Badge.jsx';
import { formatDateTime } from '../utils/format.js';

const STATUS_VARIANT = {
    pending: 'role-regular',
    approved: 'role-admin',
    rejected: 'tag',
};

const STATUS_LABEL = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
};

function CardBody({ edit, isStale }) {
    const variant = STATUS_VARIANT[edit.status] || 'tag';
    const label = STATUS_LABEL[edit.status] || edit.status;
    return (
        <>
            <div className="edit-card__head">
                <Badge variant={variant}>{label}</Badge>
                {isStale && <Badge variant="tag">stale-incoming</Badge>}
            </div>
            <p className="edit-card__title">{edit.proposed_title}</p>
            <p className="edit-card__meta">
                {`Submitted ${formatDateTime(edit.submitted_at)} • base v${edit.base_version}`}
            </p>
        </>
    );
}

export default function EditCard({
    edit,
    onClick,
    articleVersion,
}) {
    const isStale = articleVersion !== undefined
        && edit.base_version < articleVersion
        && edit.status === 'pending';

    if (onClick) {
        return (
            <button
                type="button"
                className="edit-card edit-card--button"
                onClick={onClick}
            >
                <CardBody edit={edit} isStale={isStale} />
            </button>
        );
    }
    return (
        <div className="edit-card">
            <CardBody edit={edit} isStale={isStale} />
        </div>
    );
}
