import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      // Ignore transient archive/temp files and node_modules to avoid EBUSY
      ignored: ['**/__rzi_*', '**/*.rartemp', '**/node_modules/**'],
      // Use polling fallback on Windows if native watch fails (safer on network drives)
      usePolling: true,
      interval: 1000,
    },
  },
});
