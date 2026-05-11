import { useEffect, useState } from 'react';

const STORAGE_KEY = 'stones-theme';

function readInitial() {
    if (typeof document === 'undefined') return 'dark';
    const stored = document.documentElement.getAttribute('data-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    try {
        const fromStorage = window.localStorage.getItem(STORAGE_KEY);
        if (fromStorage === 'dark' || fromStorage === 'light') return fromStorage;
    } catch (_) { /* ignore */ }
    return 'dark';
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState(readInitial);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (_) { /* ignore */ }
    }, [theme]);

    const next = theme === 'dark' ? 'light' : 'dark';
    const label = theme === 'dark' ? 'Switch to light' : 'Switch to dark';
    const glyph = theme === 'dark' ? '☀' : '☾';

    return (
        <button
            type="button"
            className="theme-toggle"
            onClick={() => setTheme(next)}
            aria-label={label}
            title={label}
        >
            <span aria-hidden="true">{glyph}</span>
        </button>
    );
}
