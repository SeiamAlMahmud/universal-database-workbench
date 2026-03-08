import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config
// __dirname is available because this config runs in CJS context (no "type":"module" in package.json)
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "src/renderer/index.html"),
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
});
