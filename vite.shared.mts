import react from '@vitejs/plugin-react';
import path from 'node:path';
import type { UserConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

export function createSharedViteConfig(): UserConfig {
  return {
    plugins: [
      react(),
      svgr({
        svgrOptions: {
          icon: true,
          exportType: 'named',
          namedExport: 'ReactComponent',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
}
