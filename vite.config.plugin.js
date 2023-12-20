import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    envPrefix: 'PR',
    base: './',
    build: {
        outDir: "dist/figma",
        lib: {
            name:     "PresentatorExport",
            entry:    "./src/figma.js",
            fileName: "figma",
            formats:  ["iife"],
        },
    },
    resolve: {
        alias: {
            '@': __dirname + '/src',
        }
    },
})
