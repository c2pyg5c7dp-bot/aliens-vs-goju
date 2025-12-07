import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: [
      '.trycloudflare.com',
      'localhost',
      '127.0.0.1'
    ],
    // HTTPS disabled for now - will use cloudflare tunnel or ngrok for Discord testing
    // https: {
    //   key: './certs/localhost-key.pem',
    //   cert: './certs/localhost.pem'
    // },
    proxy: {
      '/api': {
        target: 'https://discord.com/api',
        changeOrigin: true,
        secure: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    hmr: {
      clientPort: 5173
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    },
    // Copy game scripts as static assets instead of bundling
    copyPublicDir: true
  },
  publicDir: 'public'
});
