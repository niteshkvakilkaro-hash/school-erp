/**
 * School website ke themes. Rang CSS variables me hain (site.css) - yahan sirf
 * naam, description aur admin panel ke preview swatches.
 */
export const SITE_THEMES = [
    {
        key: 'emerald',
        name: 'Emerald Fresh',
        description: 'Halka, saaf aur hara - ERP jaisa hi brand',
        dark: false,
        swatch: ['#f6faf8', '#059669', '#34d399'],
    },
    {
        key: 'midnight',
        name: 'Midnight Neon',
        description: 'Dark, premium - purple, pink aur orange gradient',
        dark: true,
        swatch: ['#0a0918', '#c084fc', '#fdba74'],
    },
    {
        key: 'royal',
        name: 'Royal Classic',
        description: 'Navy aur gold - traditional, bharosemand school look',
        dark: false,
        swatch: ['#f7f8fc', '#1e3a8a', '#f59e0b'],
    },
    {
        key: 'sunrise',
        name: 'Sunrise Warm',
        description: 'Garam orange aur coral - chhote bachchon ke school ke liye',
        dark: false,
        swatch: ['#fffaf5', '#ea580c', '#f43f5e'],
    },
];

export const themeByKey = (k) => SITE_THEMES.find((t) => t.key === k) || SITE_THEMES[0];
