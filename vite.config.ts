import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Port khas JobTrack. Bila sedang dipakai proses lain, Vite memakai
    // port berikutnya secara otomatis (strictPort sengaja tidak diaktifkan).
    port: 5183,
    host: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
  },
});
