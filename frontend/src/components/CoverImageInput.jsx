import { useRef, useState } from 'react';
import { uploadCover } from '../api/uploads.js';
import Alert from './Alert.jsx';

const MAX_BYTES = 2 * 1024 * 1024;

function validateFile(file) {
    if (!file.type || !file.type.startsWith('image/')) {
        return 'Only image files are accepted.';
    }
    if (file.size > MAX_BYTES) {
        return 'Image is larger than 2 MB.';
    }
    return null;
}

export default function CoverImageInput({ value, onChange }) {
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef(null);

    const handleFile = async (file) => {
        if (!file) return;
        const localError = validateFile(file);
        if (localError) {
            setError(localError);
            return;
        }
        setError(null);
        setBusy(true);
        try {
            const url = await uploadCover(file);
            onChange(url);
        } catch (exc) {
            setError(exc?.response?.data?.detail || exc?.message || 'Upload failed');
        } finally {
            setBusy(false);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer?.files?.[0];
        handleFile(file);
    };

    const openPicker = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleZoneKey = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPicker();
        }
    };

    return (
        <div className="cover-input">
            <label className="form-field__label" htmlFor="cover-input-url">
                Cover image URL
            </label>
            <input
                id="cover-input-url"
                className="form-input"
                type="url"
                value={value || ''}
                onChange={(event) => onChange(event.target.value)}
                placeholder="https://…"
            />
            <div
                className="cover-input__drop"
                role="button"
                tabIndex={0}
                onClick={openPicker}
                onKeyDown={handleZoneKey}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                aria-label="Drop an image file here or press Enter to choose one"
                aria-busy={busy}
            >
                {busy ? 'Uploading…' : 'Drop an image (≤ 2 MB) or click to choose'}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => handleFile(event.target.files?.[0])}
            />
            {error && (
                <Alert variant="warning" title="Cover upload">{error}</Alert>
            )}
            {value && (
                <img
                    className="cover-input__preview"
                    src={value}
                    alt="Cover preview"
                    loading="lazy"
                />
            )}
        </div>
    );
}
