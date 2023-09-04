import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import packageJson from './package.json';


export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
  },
  envPrefix: 'PRIMAL_',
  define: {
    'import.meta.env.PRIMAL_VERSION': JSON.stringify(packageJson.version),
  },
  esbuild: {
    keepNames: true,
  },
});
