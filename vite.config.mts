import path from 'node:path';
import { defineConfig, mergeConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import { createSharedViteConfig } from './vite.shared.mts';

export default defineConfig(
  mergeConfig(createSharedViteConfig(), {
    plugins: [
      electron({
        main: {
          entry: 'electron/main.ts',
          onstart({ startup }) {
            // Keep SwiftShader available so WebContentsView can fall back to software rendering.
            startup([
              '.',
              '--no-sandbox',
              '--disable-gpu',
              '--disable-gpu-sandbox',
              '--in-process-gpu',
            ]);
          },
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        renderer: {},
      }),
    ],
  }),
);
