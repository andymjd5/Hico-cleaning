import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/flexpay-mobile': {
          target: 'https://backend.flexpay.cd',
          changeOrigin: true,
          rewrite: () => '/api/rest/v1/paymentService',
        },
        '/api/flexpay-card': {
          target: 'https://cardpayment.flexpay.cd',
          changeOrigin: true,
          rewrite: () => '/v1.1/pay',
        },
        '/api/flexpay-check': {
          target: 'https://apicheck.flexpaie.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/flexpay-check/, '/api/rest/v1/check'),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
