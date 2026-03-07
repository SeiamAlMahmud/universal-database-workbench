import { defineConfig } from "vite";
import { builtinModules } from "module";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: "src/main/index.ts",
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    outDir: ".vite/build/main",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "electron",
        "electron-squirrel-startup",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
  resolve: {
    // Use the correct conditions for Node.js / Electron main process
    conditions: ["node"],
  },
});
