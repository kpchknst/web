import { useMemo } from 'react';
import diffLines from '../utils/diff.js';

const ROW_CLASS = {
    context: 'diff__row--context',
    del: 'diff__row--del',
    add: 'diff__row--add',
};

function Cell({ entry }) {
    const text = entry.text === '' ? ' ' : entry.text;
    return (
        <pre className={`diff__cell ${ROW_CLASS[entry.type] || ''}`}>{text}</pre>
    );
}

export default function DiffView({
    oldText,
    newText,
    oldLabel = 'Current',
    newLabel = 'Proposed',
}) {
    const { left, right } = useMemo(
        () => diffLines(oldText, newText),
        [oldText, newText],
    );
    const rowCount = Math.max(left.length, right.length);
    const rows = [];
    for (let idx = 0; idx < rowCount; idx += 1) {
        rows.push({
            key: idx,
            left: left[idx] || { type: 'context', text: '' },
            right: right[idx] || { type: 'context', text: '' },
        });
    }

    return (
        <div className="diff" role="group" aria-label={`Diff: ${oldLabel} versus ${newLabel}`}>
            <div className="diff__header">
                <p className="diff__label">{oldLabel}</p>
                <p className="diff__label">{newLabel}</p>
            </div>
            <div className="diff__grid">
                {rows.map((row) => (
                    <div className="diff__row" key={row.key}>
                        <Cell entry={row.left} />
                        <Cell entry={row.right} />
                    </div>
                ))}
            </div>
        </div>
    );
}
