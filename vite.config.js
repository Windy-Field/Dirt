import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  base: "./",
  plugins: [vue()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: {
    lib: {
      entry: "js/quiz/main.js",
      formats: ["iife"],
      name: "NiyunQuizApp",
      fileName: function getQuizBundleFileName() {
        return "quiz-bundle.js";
      },
    },
    rollupOptions: {
      output: {
        entryFileNames: "assets/quiz-bundle.js",
      },
    },
  },
});
