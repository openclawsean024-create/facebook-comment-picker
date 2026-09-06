import js from "@eslint/js";
import globals from "globals";

/**
 * 寬鬆的 lint 設定：只抓顯而易見的 bug
 * - React 19 `set-state-in-effect` 等風格規則不在這層擋，留給後續 PR 重構
 * - 主要擋：未宣告變數、unreachable code、明顯語法錯誤
 */
export default [
  { ignores: ["dist/**", "node_modules/**", "scripts/**", "*.config.{js,mjs}", "tests/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-undef": "warn", // FB / window 全域有但 ESLint 認不到 — 降為 warn
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-unreachable": "error",
      "no-dupe-keys": "error",
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    files: ["api/**/*.js", "src/lib/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];
