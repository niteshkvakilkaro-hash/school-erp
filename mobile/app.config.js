/**
 * app.json ke upar - web export ko kisi sub-path par chalana ho (backend `/app`
 * par serve karta hai) to EXPO_BASE_URL=/app dekar export kijiye.
 */
module.exports = ({ config }) => ({
    ...config,
    experiments: {
        ...(config.experiments || {}),
        ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
    },
});
