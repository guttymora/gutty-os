import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    resolve: {
        // Path aliases (@shared/*, ...) live in tsconfig.json
        tsconfigPaths: true,
    },
});
