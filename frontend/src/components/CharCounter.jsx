export default function CharCounter({ value, max }) {
    const { length } = String(value || '');
    const ratio = max > 0 ? length / max : 0;
    let modifier = '';
    if (length >= max) {
        modifier = ' char-counter--over';
    } else if (ratio >= 0.9) {
        modifier = ' char-counter--warn';
    }
    return (
        <span
            className={`char-counter${modifier}`}
            aria-live="polite"
        >
            {`${length} / ${max}`}
        </span>
    );
}
