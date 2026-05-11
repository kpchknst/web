import {
    useEffect,
    useRef,
    useState,
} from 'react';

const DEBOUNCE_MS = 300;

export default function SearchBox({
    value,
    onChange,
    placeholder = 'Search…',
}) {
    const [text, setText] = useState(value || '');
    const timeoutRef = useRef(null);
    const lastPropRef = useRef(value || '');

    useEffect(() => {
        if ((value || '') !== lastPropRef.current) {
            lastPropRef.current = value || '';
            setText(value || '');
        }
    }, [value]);

    useEffect(() => () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const scheduleEmit = (next) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            lastPropRef.current = next;
            onChange(next);
        }, DEBOUNCE_MS);
    };

    const handleChange = (event) => {
        const next = event.target.value;
        setText(next);
        scheduleEmit(next);
    };

    const handleClear = () => {
        setText('');
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        lastPropRef.current = '';
        onChange('');
    };

    return (
        <div className="search-box">
            <input
                className="search-box__input"
                type="search"
                value={text}
                onChange={handleChange}
                placeholder={placeholder}
                aria-label={placeholder}
            />
            {text && (
                <button
                    type="button"
                    className="search-box__clear"
                    onClick={handleClear}
                    aria-label="Clear search"
                >
                    ×
                </button>
            )}
        </div>
    );
}
