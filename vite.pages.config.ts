import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "Auxilia-web";
const base = process.env.GITHUB_ACTIONS ? `/${repository}/` : "/";

export default defineConfig({
  base,
  plugins: [react()],
  define: {
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify(process.env.VITE_API_URL || "https://auxilia-web.trap.show"),
    "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(base === "/" ? "" : base.slice(0, -1)),
  },
  build: { outDir: "dist-pages", emptyOutDir: true },
});
