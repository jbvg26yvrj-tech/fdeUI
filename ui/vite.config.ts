import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
 const env = loadEnv(mode, process.cwd(), '');
 const sslKeyPath = env.VITE_SSL_KEY_FILE;
 const sslCertPath = env.VITE_SSL_CERT_FILE;
 const port = parseInt(env.VITE_PORT);
 const host = env.VITE_HOST;

 // Используем существующие переменные окружения
 const backendPort = env.VITE_API_BACKEND_PORT;
 const backendUrl = `http://${host}:${backendPort}`;

 console.log('Backend URL for proxy:', backendUrl);

 const useHttps = env.HTTPS === 'true';

 // Конфигурация сервера
 const serverConfig = {
    port: port,
   host: host,
   cors: true,

   // НАСТРОЙКА ПРОКСИ ДЛЯ API ЗАПРОСОВ
   proxy: {
     // Прокси для API запросов
     '/api': {
       target: backendUrl,
       changeOrigin: true,
       secure: false,
       ws: true,
       configure: (proxy: any) => {
         proxy.on('proxyReq', (proxyReq: any, req: any) => {
           console.log('[PROXY] Forwarding request:', req.method, req.url);

           // Копируем все заголовки из исходного запроса
           const headers = req.headers;

           // Передаем заголовок авторизации, если есть
           if (headers.authorization) {
             proxyReq.setHeader('Authorization', headers.authorization);
           }

           // Передаем куки, если есть
           if (headers.cookie) {
             proxyReq.setHeader('Cookie', headers.cookie);
           }

           // Передаем другие важные заголовки
           if (headers['content-type']) {
             proxyReq.setHeader('Content-Type', headers['content-type']);
           }
         });

         proxy.on('proxyRes', (proxyRes: any, req: any) => {
           console.log('[PROXY] Received response:', proxyRes.statusCode, req.url);
         });

         proxy.on('error', (err: any) => {
           console.error('[PROXY] Error:', err);
         });
       },
     },
   },

   hmr: {
     protocol: useHttps ? 'wss' : 'ws',
     host: host,
   },
 };

 // Добавляем SSL конфигурацию если включен HTTPS
 if (useHttps && fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
   (serverConfig as any).https = {
     key: fs.readFileSync(sslKeyPath),
     cert: fs.readFileSync(sslCertPath),
   };
   console.log('SSL certificates loaded successfully');
 }

 return {
   root: './src',
   base: '/',
   server: serverConfig,
   plugins: [
     react(),
     tailwindcss(),
     process.env.ANALYZE === 'true'
       ? visualizer({
           open: true,
           filename: 'build/stats.html',
           gzipSize: true,
           brotliSize: true,
         })
       : null,
   ].filter(Boolean),
   build: {
     outDir: '../dist',
     minify: 'esbuild',
     cssCodeSplit: true,
     emptyOutDir: true,
     rollupOptions: {
       output: {
         manualChunks: undefined,
       },
     },
   },
   optimizeDeps: {
     include: ['react', 'react-dom'],
   },
   preview: {
     port: port,
     host: host,
     ...(useHttps &&
       fs.existsSync(sslKeyPath) &&
       fs.existsSync(sslCertPath) && {
         https: {
           key: fs.readFileSync(sslKeyPath),
           cert: fs.readFileSync(sslCertPath),
         },
       }),
   },
   test: {
     globals: true,
     environment: 'jsdom',
     setupFiles: './src/test/setup.ts',
     deps: {
       optimizer: {
         web: {
           include: [
             '@asamuzakjp/css-color',
             '@csstools/css-calc',
             // можно добавить другие проблемные пакеты, если появятся
           ],
         },
       },
     },
     pool: 'forks',
     forksOptions: {
       singleFork: true,
     },
     optimizeDeps: {
       include: ['react', 'react-dom', '@asamuzakjp/css-color', '@csstools/css-calc'],
       esbuildOptions: {
         platform: 'browser',
       },
     },
   },
 };
});