import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],

  resolve: {
    dedupe: ["react", "react-dom"],

    alias: {
      "server-only": fileURLToPath(
        new URL("./vitest.server-only.ts", import.meta.url),
      ),
    },
  },

  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true,
    restoreMocks: true,

    server: {
      deps: {
        inline: ["mino-ui"],
      },
    },
  },
});
