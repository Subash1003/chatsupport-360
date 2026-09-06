import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Fail loudly instead of silently moving to port 5174, which would break
    // the CORS allow-list we configured in the backend.
    strictPort: true,
  },
});
