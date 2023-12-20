import { defineConfig }           from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile }         from "vite-plugin-singlefile"

// https://vitejs.dev/config
export default defineConfig({
    envPrefix: 'PR',
    base: './',
    build: {
        chunkSizeWarningLimit: 1000,
        reportCompressedSize: false,
        outDir: "dist/ui",
    },
    plugins: [
        svelte({
            preprocess: [vitePreprocess()],
            onwarn: (warning, handler) => {
                if (warning.code.startsWith('a11y-')) {
                    return; // silence a11y warnings
                }
                handler(warning);
            },
        }),
        viteSingleFile(),
    ],
    resolve: {
        alias: {
            '@': __dirname + '/src',
        }
    },
})
