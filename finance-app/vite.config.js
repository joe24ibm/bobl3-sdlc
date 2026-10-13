import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiMiddleware } from './server/apiMiddleware.js';
import * as yahooClient from './server/yahooClient.js';

// Serves /api/quotes and /api/history from Yahoo Finance in both `dev` and `preview`,
// because Yahoo blocks direct browser requests (CORS).
function yahooApi() {
  const middleware = createApiMiddleware(yahooClient);
  return {
    name: 'yahoo-finance-api',
    // Block bodies on purpose: a returned function would be run by Vite as a post-hook.
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

export default defineConfig({
  plugins: [react(), yahooApi()],
  test: {
    // Pure logic and server tests run in node; component tests (*.test.jsx) need a DOM.
    environment: 'node',
    environmentMatchGlobs: [['src/**/*.test.jsx', 'jsdom']],
    setupFiles: ['./src/test/setup.js'],
  },
});
