import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    tsconfigPaths(),
  ],
  build: {
  outDir: "dist",
},
  server: {
    host: "0.0.0.0",
    allowedHosts: [
      "beauty-hub-platform-production.up.railway.app",
    ],
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: [
      "beauty-hub-platform-production.up.railway.app",
    ],
  },
});
