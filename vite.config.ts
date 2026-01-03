import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        options: resolve(__dirname, "options.html"),
        content: resolve(__dirname, "src/content/index.ts")
      }
    },
    emptyOutDir: true
  }
});
