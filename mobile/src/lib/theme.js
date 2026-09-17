/**
 * Web app (frontend/src/index.css) ke wahi tokens, React Native ke liye JS object me.
 * Dono jagah ek hi brand dikhe isliye values hu-ba-hu copy ki gayi hain.
 */
const light = {
    background: '#f3f7f5',
    foreground: '#0b1f19',
    card: '#ffffff',
    cardForeground: '#0b1f19',
    primary: '#059669',
    primaryForeground: '#ffffff',
    secondary: '#e8f3ee',
    secondaryForeground: '#064e3b',
    muted: '#eef4f1',
    mutedForeground: '#5b6b66',
    accent: '#e3f5ec',
    accentForeground: '#065f46',
    destructive: '#d03b3b',
    border: '#dfe8e4',
    input: '#d7e2dd',
    ring: '#34d399',
    success: '#047857',
    warning: '#b45309',
    sidebar: '#042f24',
    sidebarForeground: '#c9e9dc',
};

const dark = {
    background: '#06140f',
    foreground: '#e6f4ee',
    card: '#0c1f19',
    cardForeground: '#e6f4ee',
    primary: '#34d399',
    primaryForeground: '#032b21',
    secondary: '#12302a',
    secondaryForeground: '#d1fae5',
    muted: '#11271f',
    mutedForeground: '#93aca3',
    accent: '#133a2d',
    accentForeground: '#d1fae5',
    destructive: '#e66767',
    border: '#1b3a2f',
    input: '#21443a',
    ring: '#34d399',
    success: '#34d399',
    warning: '#fab219',
    sidebar: '#031d16',
    sidebarForeground: '#b9dccd',
};

export const palette = { light, dark };

export const brand = {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
    950: '#032b21',
};

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, full: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const getColors = (scheme) => (scheme === 'dark' ? dark : light);
