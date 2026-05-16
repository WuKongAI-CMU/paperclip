import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { analyzer } from "vite-bundle-analyzer";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { createUiDevWatchOptions } from "./src/lib/vite-watch";

const sentrySourceMapUploadEnabled = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
    process.env.SENTRY_ORG &&
    process.env.SENTRY_PROJECT,
);

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    process.env.DEARME_BUNDLE_ANALYZE === "1"
      ? analyzer({
          analyzerMode: "static",
          defaultSizes: "gzip",
          fileName: "dearme-bundle-report",
          openAnalyzer: false,
          reportTitle: "DearMe UI Bundle",
        })
      : null,
    sentrySourceMapUploadEnabled
      ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          telemetry: false,
          release: {
            name: process.env.DEARME_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE ?? process.env.GITHUB_SHA,
          },
          sourcemaps: {
            filesToDeleteAfterUpload: ["dist/**/*.map"],
          },
        })
      : null,
  ],
  build: {
    minify: "esbuild",
    sourcemap: sentrySourceMapUploadEnabled,
  },
  esbuild:
    mode === "production"
      ? {
          drop: ["console", "debugger"],
          legalComments: "none",
        }
      : undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      lexical: path.resolve(__dirname, "./node_modules/lexical/Lexical.mjs"),
    },
  },
  server: {
    port: 5173,
    watch: createUiDevWatchOptions(process.cwd()),
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        ws: true,
      },
    },
  },
}));
