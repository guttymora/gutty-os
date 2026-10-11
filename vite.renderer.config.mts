import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    plugins: [react()],
    resolve: {
        // Path aliases (@components/*, @styles/*, ...) live in tsconfig.json
        tsconfigPaths: true,
    },
});
