import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";
import electron from 'vite-plugin-electron/simple'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react(),
        svgr({
            svgrOptions: {
                icon: true,
                exportType: "named",
                namedExport: "ReactComponent",
            },
        }),
        electron({
            main: {
                // Shortcut of `build.lib.entry`.
                entry: 'electron/main.ts',
            },
            preload: {
                // Shortcut of `build.rollupOptions.input`.
                // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
                input: path.join(__dirname, 'electron/preload.ts'),
            },
            // Ployfill the Electron and Node.js built-in modules for Renderer process.
            // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
            renderer: {},
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});