import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const apiTarget = env.VITE_API_TARGET || 'http://localhost:8001';

    return {
        plugins: [react()],
        server: {
            port: 5173,
            strictPort: false,
            open: false,
            proxy: {
                '/api': {
                    target: apiTarget,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        preview: {
            port: 4173,
        },
        build: {
            outDir: 'dist',
            sourcemap: false,
        },
    };
});
