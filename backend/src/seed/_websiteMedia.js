import { SiteMedia } from '../models/index.js';
import { saveImage } from '../utils/upload.js';

/**
 * Demo photo (SVG se) - gradient aasmaan, pahadiyan, school building aur label.
 * Asli school apni photos upload karega; ye sirf demo ko khaali na dikhne ke liye.
 */
function scene({ w, h, from, to, variant = 0 }) {
    const hills = variant % 2
        ? `<path d="M0 ${h * 0.72} Q ${w * 0.25} ${h * 0.58} ${w * 0.5} ${h * 0.7} T ${w} ${h * 0.64} V ${h} H 0 Z" fill="#ffffff" opacity="0.18"/>`
        : `<path d="M0 ${h * 0.66} Q ${w * 0.3} ${h * 0.54} ${w * 0.6} ${h * 0.68} T ${w} ${h * 0.6} V ${h} H 0 Z" fill="#ffffff" opacity="0.18"/>`;
    const bx = w * (variant % 3 === 0 ? 0.58 : 0.12);
    const bw = w * 0.3;
    const by = h * 0.46;
    const building = `
      <g opacity="0.9">
        <rect x="${bx}" y="${by}" width="${bw}" height="${h * 0.3}" rx="8" fill="#ffffff" opacity="0.92"/>
        <polygon points="${bx - 14},${by + 4} ${bx + bw / 2},${by - h * 0.12} ${bx + bw + 14},${by + 4}" fill="#ffffff" opacity="0.95"/>
        ${[0, 1, 2, 3]
            .map((i) => `<rect x="${bx + bw * (0.1 + i * 0.21)}" y="${by + h * 0.06}" width="${bw * 0.12}" height="${h * 0.07}" rx="4" fill="${from}" opacity="0.55"/>`)
            .join('')}
        <rect x="${bx + bw * 0.42}" y="${by + h * 0.18}" width="${bw * 0.16}" height="${h * 0.12}" rx="4" fill="${to}" opacity="0.7"/>
      </g>`;
    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>
      </defs>
      <rect width="${w}" height="${h}" fill="url(#g)"/>
      <circle cx="${w * 0.82}" cy="${h * 0.2}" r="${h * 0.12}" fill="#ffffff" opacity="0.25"/>
      <circle cx="${w * 0.15}" cy="${h * 0.18}" r="${h * 0.3}" fill="#ffffff" opacity="0.07"/>
      ${hills}
      ${building}
      <rect x="${w * 0.03}" y="${h * 0.04}" width="${h * 0.2}" height="${h * 0.05}" rx="${h * 0.025}" fill="#000000" opacity="0.28"/>
      <text x="${w * 0.03 + h * 0.1}" y="${h * 0.074}" text-anchor="middle" font-family="Arial, sans-serif" font-size="${h * 0.022}" font-weight="700" letter-spacing="2" fill="#ffffff">DEMO PHOTO</text>
    </svg>`);
}

const PALETTES = [
    ['#4c1d95', '#db2777'],
    ['#065f46', '#10b981'],
    ['#1e3a8a', '#0ea5e9'],
    ['#9a3412', '#f59e0b'],
    ['#0f766e', '#84cc16'],
    ['#7c2d12', '#e11d48'],
];

const SLIDES = [
    ['A campus full of curiosity', 'Labs, library and green spaces for every child'],
    ['Champions on and off the field', 'Annual Sports Meet 2026'],
    ['Where every voice is heard', 'Annual Day celebrations'],
];

const GALLERY = [
    ['Main building', 'Campus'],
    ['Science lab', 'Campus'],
    ['Library corner', 'Campus'],
    ['100m sprint final', 'Sports'],
    ['Inter-house football', 'Sports'],
    ['Yoga day', 'Sports'],
    ['Annual Day dance', 'Events'],
    ['Science exhibition', 'Events'],
    ['Independence Day', 'Events'],
];

export async function seedWebsiteMedia(school) {
    let n = 0;
    for (const [i, [title, caption]] of SLIDES.entries()) {
        const [from, to] = PALETTES[(i + school.id) % PALETTES.length];
        const img = await saveImage(scene({ w: 1920, h: 1000, from, to, variant: i * 3 }), school.id, 'slide');
        await SiteMedia.create({ schoolId: school.id, kind: 'slide', ...img, title, caption, sortOrder: i });
        n++;
    }
    for (const [i, [title, category]] of GALLERY.entries()) {
        const [from, to] = PALETTES[(i + 2) % PALETTES.length];
        const tall = i % 4 === 1;
        const img = await saveImage(
            scene({ w: tall ? 900 : 1400, h: tall ? 1200 : 950, from, to, variant: i }),
            school.id,
            'gallery'
        );
        await SiteMedia.create({ schoolId: school.id, kind: 'gallery', ...img, caption: title, category, sortOrder: i });
        n++;
    }
    return n;
}
