import { defineConfig, loadEnv } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import packageJson from './package.json';
import { VitePWA } from 'vite-plugin-pwa';


export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  console.log('[VITE CONFIG] Mode:', mode);
  console.log('[VITE CONFIG] VITE_BREEZ_API_KEY from env:', env.VITE_BREEZ_API_KEY);
  console.log('[VITE CONFIG] First 20 chars:', env.VITE_BREEZ_API_KEY?.substring(0, 20));

  return {
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
    },
    envPrefix: ['PRIMAL_', 'VITE_'], // Support both prefixes
    define: {
      'import.meta.env.PRIMAL_VERSION': JSON.stringify(packageJson.version),
      'import.meta.env.VITE_BREEZ_API_KEY': JSON.stringify(env.VITE_BREEZ_API_KEY),
    },
    esbuild: {
      keepNames: true,
    },
    // Ensure WASM files are properly handled
    optimizeDeps: {
      exclude: ['@breeztech/breez-sdk-spark'],
    },
    worker: {
      format: 'es',
    },
  };
});
