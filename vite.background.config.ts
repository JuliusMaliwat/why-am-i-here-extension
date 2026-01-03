import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, "src/background/index.ts"),
      output: {
        format: "iife",
        entryFileNames: "background.js",
        inlineDynamicImports: true
      }
    }
  }
});
