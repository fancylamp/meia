import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { copyFileSync } from "fs"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "copy-manifest",
      closeBundle() {
        copyFileSync("public/manifest.json", "dist/manifest.json")
        copyFileSync("public/logo.svg", "dist/logo.svg")
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    cssCodeSplit: false,
    rollupOptions: {
      input: { content: path.resolve(__dirname, "src/content.tsx") },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "content.[ext]",
        format: "iife",
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
})
