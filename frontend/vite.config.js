import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        rollupOptions: {
            output: {
                // recharts bada hai - alag chunk me rakhne se initial load halka rehta hai
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom'],
                    charts: ['recharts'],
                },
            },
        },
    },
    resolve: {
        alias: { '@': path.resolve(process.cwd(), 'src') },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': { target: 'http://localhost:5000', changeOrigin: true },
        },
    },
});
