import { useEffect, useState } from 'react';
import { listTags } from '../api/tags.js';
import Alert from './Alert.jsx';
import Spinner from './Spinner.jsx';

export default function TagFilter({ selected, onChange }) {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        listTags()
            .then((data) => {
                if (!cancelled) {
                    setTags(Array.isArray(data) ? data : []);
                }
            })
            .catch((exc) => {
                if (!cancelled) {
                    setError(exc?.response?.data?.detail || exc?.message || 'Failed to load tags');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const toggle = (slug) => {
        if (selected.includes(slug)) {
            onChange(selected.filter((s) => s !== slug));
        } else {
            onChange([...selected, slug]);
        }
    };

    if (loading) {
        return <Spinner label="Loading tags…" />;
    }
    if (error) {
        return <Alert variant="danger" title="Tag filter">{error}</Alert>;
    }

    return (
        <div className="tag-filter">
            {selected.length > 0 && (
                <p className="tag-filter__summary">
                    {`Filtering by ${selected.length}`}
                </p>
            )}
            <div className="tag-filter__chips">
                {tags.map((tag) => {
                    const isOn = selected.includes(tag.slug);
                    const className = isOn
                        ? 'tag-filter__chip tag-filter__chip--on'
                        : 'tag-filter__chip';
                    return (
                        <button
                            type="button"
                            key={tag.id ?? tag.slug}
                            className={className}
                            onClick={() => toggle(tag.slug)}
                            aria-pressed={isOn}
                        >
                            {tag.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
