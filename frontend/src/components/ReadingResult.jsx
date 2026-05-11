import { useMemo } from 'react';
import { marked } from 'marked';

import { formatDate } from '../utils/format.js';

marked.setOptions({ gfm: true, breaks: false });

export default function ReadingResult({ reading }) {
    const html = useMemo(
        () => marked.parse(reading.content || ''),
        [reading.content],
    );

    const stoneLabel = (reading.stone_slugs || []).join(' · ');
    const dateLabel = formatDate(reading.created_at);
    const kindLabel = reading.kind === 'perfume' ? 'Perfume' : 'Personality';
    const badgeVariant = reading.kind === 'perfume' ? 'role-admin' : 'role-regular';

    return (
        <article className="reading-result">
            <header className="reading-result__header">
                <span className={`badge badge--${badgeVariant}`}>{kindLabel}</span>
                <span className="reading-result__meta">
                    {stoneLabel}
                    {' · '}
                    {dateLabel}
                </span>
            </header>
            <div
                className="reading-result__body"
                /* eslint-disable-next-line react/no-danger */
                dangerouslySetInnerHTML={{ __html: html }}
            />
            <p className="reading-result__disclaimer">
                AI-generated — verify before buying.
            </p>
        </article>
    );
}
