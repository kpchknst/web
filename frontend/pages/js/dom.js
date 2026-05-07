const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
};

export const escapeHtml = (value) => String(value ?? '')
    .replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

export const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
};

export const splitParagraphs = (content) => (content ?? '')
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean);

export const buildExcerpt = (content, maxLength = 220) => {
    const trimmed = (content ?? '').replace(/\s+/g, ' ').trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength - 3)}…`;
};
