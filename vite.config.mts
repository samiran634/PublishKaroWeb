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
                // Shortcut of `build.lib.entry`
                entry: 'electron/main.ts',
                onstart({ startup }) {
                    // GPU flags for Haswell/older hardware crash fix.
                    // --disable-gpu: prevent hardware GPU process crash
                    // --in-process-gpu: run GPU in main process (avoids GPU subprocess crash)
                    // --disable-gpu-sandbox: needed alongside no-sandbox
                    // NOTE: Do NOT add --disable-software-rasterizer — that kills SwiftShader
                    //       which is the software fallback. Without it, WebContentsView gets
                    //       kFatalFailure and can't render anything (not even localhost!).
                    // NOTE: Do NOT add --disable-gpu-compositing — app.disableHardwareAcceleration()
                    //       in main.ts already handles this correctly.
                    startup([
                        '.',
                        '--no-sandbox',
                        '--disable-gpu',
                        '--disable-gpu-sandbox',
                        '--in-process-gpu',
                    ])
                },
            },
            preload: {
                // Shortcut of `build.rollupOptions.input`
                // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`
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