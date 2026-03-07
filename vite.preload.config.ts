import { defineConfig } from "vite";
import { builtinModules } from "module";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    lib: {
      entry: "src/preload/index.ts",
      formats: ["cjs"],
      fileName: () => "index.js",
    },
    outDir: ".vite/build/preload",
    emptyOutDir: true,
    rollupOptions: {
      external: [
        "electron",
        ...builtinModules,
        ...builtinModules.map((m) => `node:${m}`),
      ],
    },
  },
  resolve: {
    conditions: ["node"],
  },
});
