
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      input: {
        popup: "popup.html",
        workspace: "workspace.html",
        background: "src/background.ts"
      },

      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    },

    outDir: "dist",
    emptyOutDir: true
  }
});
