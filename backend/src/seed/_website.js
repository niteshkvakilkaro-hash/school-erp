import { SchoolSite } from '../models/index.js';
import { defaultSite } from '../controllers/website.controller.js';

// Har demo school ki website alag theme me - theme switch dikhane ke liye
const CONTENT = {
    'SPS-INDORE': {
        theme: 'midnight',
        heroTitle: 'Learn smarter.',
        heroHighlight: 'Dream bigger.',
        establishedYear: 2004,
        affiliation: 'CBSE affiliated',
        principalName: 'Dr. Meena Kulkarni',
        principalMessage:
            'Our aim is simple: every child should leave school curious, confident and kind. We keep classes small, listen to parents and measure success by how our students grow - not only by marks.',
        socials: { facebook: 'https://facebook.com/', instagram: 'https://instagram.com/', whatsapp: '9826000000' },
        admissionNote: 'Nursery to Class 10 - limited seats. Campus visits every Saturday, 10 am to 1 pm.',
    },
    'GVA-BHOPAL': {
        theme: 'emerald',
        heroTitle: 'Rooted in values.',
        heroHighlight: 'Growing with joy.',
        establishedYear: 2012,
        affiliation: 'MP Board',
        principalName: 'Mr. Arvind Rao',
        principalMessage:
            'Green Valley is a close-knit school where teachers know every family. We blend strong basics with sports, music and nature so children enjoy coming to school every day.',
        socials: { instagram: 'https://instagram.com/' },
        admissionNote: null,
    },
};

export async function seedWebsite(school) {
    await SchoolSite.create({ ...defaultSite(school), published: true, ...(CONTENT[school.code] || {}) });
    return CONTENT[school.code]?.theme || 'emerald';
}
