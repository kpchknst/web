import { tags } from './tags.js';

export const articles = [
    {
        id: 'a-001',
        slug: 'rose-quartz',
        title: 'Rose Quartz',
        content: 'Soft pink crystal of the heart. Pairs with Tom Ford Rose Prick.',
        cover_image_url: null,
        author_id: 'u-admin-001',
        version: 1,
        created_at: '2026-01-10T10:00:00Z',
        updated_at: '2026-01-10T10:00:00Z',
        tags: [tags[0], tags[1]],
    },
    {
        id: 'a-002',
        slug: 'amethyst',
        title: 'Amethyst',
        content: 'Violet quartz. Calming, intuitive. Pairs with Jo Malone Wood Sage & Sea Salt.',
        cover_image_url: null,
        author_id: 'u-admin-001',
        version: 2,
        created_at: '2026-01-11T10:00:00Z',
        updated_at: '2026-01-12T10:00:00Z',
        tags: [tags[0]],
    },
    {
        id: 'a-003',
        slug: 'black-tourmaline',
        title: 'Black Tourmaline',
        content: 'Grounding, protective. Pairs with smoky-vetiver scents.',
        cover_image_url: null,
        author_id: 'u-admin-001',
        version: 1,
        created_at: '2026-01-13T10:00:00Z',
        updated_at: '2026-01-13T10:00:00Z',
        tags: [tags[3]],
    },
];

export default articles;
