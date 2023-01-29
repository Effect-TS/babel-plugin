/// <reference types="vitest" />
import path from "path"
import { defineConfig } from "vite"

export default defineConfig({
  test: {
    include: ["./test/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: ["./test/utils/**/*.ts", "./test/**/*.init.ts"],
    globals: true
  },
  resolve: {
    alias: {
      "@repo-tooling/babel-plugin/test": path.join(__dirname, "test"),
      "@repo-tooling/babel-plugin": path.join(__dirname, "src")
    }
  }
})
