import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        workspace: resolve(__dirname, "workspace.html"),
        background: resolve(__dirname, "src/background.ts")
      },
      output: { entryFileNames: "[name].js" }
    }
  }
});
