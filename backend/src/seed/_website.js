import { SchoolSite } from '../models/index.js';
import { defaultSite } from '../controllers/website.controller.js';

const TESTIMONIALS = [
    { name: 'Priya Agarwal', role: 'Parent, Class 4', text: 'Teachers really know my daughter. The parent app keeps me updated on homework and attendance every day.' },
    { name: 'Rahul Verma', role: 'Parent, Class 8', text: 'Great balance of studies and sports. My son finally enjoys going to school.' },
    { name: 'Sneha Joshi', role: 'Alumni, Batch 2022', text: 'The labs and the library shaped my interest in science. Grateful to my teachers.' },
];

const FAQS = [
    { q: 'When do admissions open?', a: 'Admissions for the new session open in December. Enquiries are welcome throughout the year.' },
    { q: 'Is school transport available?', a: 'Yes, buses and vans cover most parts of the city with trained drivers and attendants.' },
    { q: 'What documents are needed?', a: 'Birth certificate, previous report card, transfer certificate (Class 2 onwards), Aadhaar and 4 photos.' },
    { q: 'Can we visit the campus?', a: 'Of course - campus visits happen every Saturday from 10 am to 1 pm. Just send an enquiry first.' },
];

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
    await SchoolSite.create({
        ...defaultSite(school),
        published: true,
        testimonials: TESTIMONIALS,
        faqs: FAQS,
        ...(CONTENT[school.code] || {}),
    });
    return CONTENT[school.code]?.theme || 'emerald';
}
