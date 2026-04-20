import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Proxy /api -> backend pe 4000 ca să n-avem probleme CORS în dev
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // ascultă pe toate interfețele — permite acces din LAN (telefon etc.)
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
