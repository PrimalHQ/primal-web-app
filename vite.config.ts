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
    cssCodeSplit: true, // Enable CSS code splitting
    rollupOptions: {
      output: {
        experimentalMinChunkSize: 20000, // Merge chunks smaller than 20KB
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          const normalized = id.replace(/\\/g, '/');

          const match = (packages: string[]) =>
            packages.some((pkg) =>
              normalized.includes(`/node_modules/${pkg}/`) ||
              normalized.includes(`/node_modules/${pkg}@`) ||
              normalized.includes(pkg)
            );

          // Split TipTap into separate chunks for better lazy loading
          if (match(['@tiptap/core'])) {
            return 'tiptap-core';
          }

          if (match(['@tiptap/'])) {
            return 'tiptap-extensions';
          }

          if (match([
            '@milkdown/',
            'prosemirror-',
            'tiptap-markdown',
          ])) {
            return 'editor-deps';
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
          ])) {
            return 'media-utils';
          }

          if (match(['dayjs'])) {
            return 'date-utils';
          }

          if (match([
            'nostr-tools',
            '@cashu/cashu-ts',
            '@scure/base',
            'light-bolt11-decoder',
          ])) {
            return 'nostr';
          }

          // Group video/streaming libraries
          if (match([
            'hls.js',
            'hls-video-element',
            '@videojs',
            'videojs-video-element',
            'media-chrome',
          ])) {
            return 'video-streaming';
          }

          // Group markdown/content processing
          if (match([
            'rehype',
            'remark',
            'unified',
            'unist-util-visit',
          ])) {
            return 'markdown-processing';
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
