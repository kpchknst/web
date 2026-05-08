export function formatDate(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

export function formatDateTime(iso) {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const d = date.toISOString();
    return `${d.slice(0, 10)} ${d.slice(11, 16)}`;
}

export function splitParagraphs(content) {
    return (content ?? '')
        .split(/\n{2,}/)
        .map((para) => para.trim())
        .filter(Boolean);
}

export function buildExcerpt(content, maxLength = 220) {
    const trimmed = (content ?? '').replace(/\s+/g, ' ').trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength - 3)}…`;
}
