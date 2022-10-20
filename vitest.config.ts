/// <reference types="vitest" />
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["packages/*/test/**/util.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@repo-tooling/babel-plugin/test": path.resolve(__dirname, "packages/babel-plugin/test"),
      "@repo-tooling/babel-plugin": path.resolve(__dirname, "packages/babel-plugin/src")
    }
  }
})
