import { useState } from 'react';

import { createReading } from '../api/readings.js';
import Alert from '../components/Alert.jsx';
import ReadingResult from '../components/ReadingResult.jsx';
import Spinner from '../components/Spinner.jsx';
import StonePicker from '../components/StonePicker.jsx';

const MODES = [
    { key: 'perfume', label: 'Get your perfume' },
    { key: 'personality', label: 'Get your personality reading' },
];

export default function ReadingPage() {
    const [mode, setMode] = useState('perfume');
    const [selected, setSelected] = useState([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [reading, setReading] = useState(null);

    const canSubmit = selected.length >= 1 && !busy;

    const handleGenerate = async () => {
        setBusy(true);
        setError('');
        setReading(null);
        try {
            const data = await createReading({ kind: mode, stoneSlugs: selected });
            setReading(data);
        } catch (caught) {
            setError(caught?.message || 'Could not generate the reading.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <section className="page-reading" aria-labelledby="reading-title">
            <h1 id="reading-title" className="page-reading__title">Your stone reading</h1>
            <p className="page-reading__subtitle">
                Pick a mode and 1–3 stones. The reading is generated for you
                and saved to your profile.
            </p>

            <div className="page-reading__mode-toggle" role="tablist" aria-label="Reading mode">
                {MODES.map((m) => (
                    <button
                        key={m.key}
                        type="button"
                        role="tab"
                        aria-selected={mode === m.key}
                        className={
                            mode === m.key
                                ? 'btn btn--primary'
                                : 'btn btn--secondary'
                        }
                        onClick={() => setMode(m.key)}
                        disabled={busy}
                    >
                        {m.label}
                    </button>
                ))}
            </div>

            <StonePicker
                selected={selected}
                onToggle={setSelected}
                disabled={busy}
            />

            <div className="form-actions page-reading__actions">
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleGenerate}
                    disabled={!canSubmit}
                >
                    {busy ? 'Generating…' : 'Generate'}
                </button>
            </div>

            {busy && <Spinner label="Consulting the stones…" />}

            {error && (
                <Alert variant="danger" title="Couldn't generate the reading">
                    {error}
                </Alert>
            )}

            {reading && <ReadingResult reading={reading} />}
        </section>
    );
}
