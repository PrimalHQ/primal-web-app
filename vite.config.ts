import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import packageJson from './package.json';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig({
  plugins: [
    solidPlugin(),
    VitePWA({
      srcDir: "/",
      filename: "imageCacheWorker.js",
      strategies: "injectManifest",
      injectRegister: false,
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: {
        enabled: true,
        type: 'module',
        /* other options */
      }
    })
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    manifest: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          const normalized = id.replace(/\\/g, '/');

          const match = (packages: string[]) =>
            packages.some((pkg) =>
              normalized.includes(`/node_modules/${pkg}/`) ||
              normalized.includes(`/node_modules/${pkg}@`) ||
              normalized.includes(pkg)
            );

          if (match([
            '@milkdown/',
            '@tiptap/',
            'prosemirror-',
          ])) {
            return 'editor';
          }

          if (match([
            'photoswipe',
            'photoswipe-dynamic-caption-plugin',
            'photoswipe-video-plugin',
          ])) {
            return 'photoswipe';
          }

          if (match([
            'medium-zoom',
            'highlight.js',
            'dayjs',
          ])) {
            return 'media';
          }

          if (match([
            'nostr-tools',
            '@cashu/cashu-ts',
            '@scure/base',
          ])) {
            return 'nostr';
          }

          return undefined;
        },
      },
    },
  },
  envPrefix: 'PRIMAL_',
  define: {
    'import.meta.env.PRIMAL_VERSION': JSON.stringify(packageJson.version),
  },
  esbuild: {
    keepNames: true,
  },
});
