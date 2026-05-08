const modules = import.meta.glob('../../pages/assets/stones/*.jpg', {
    eager: true,
    query: '?url',
    import: 'default',
});

const imageEntries = Object.entries(modules)
    .map(([path, url]) => {
        const match = path.match(/([^/]+)\.jpg$/);
        return match ? [match[1], url] : null;
    })
    .filter(Boolean);

const imagesBySlug = Object.fromEntries(imageEntries);

export function getStoneImageUrl(slug) {
    return imagesBySlug[slug] || null;
}
