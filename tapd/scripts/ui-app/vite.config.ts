import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "ui-app",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../ui",
    emptyOutDir: true,
  },
});
