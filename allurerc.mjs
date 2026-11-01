import { defineConfig } from 'allure';

// One HTML file with everything inside (results, steps, screenshots). It opens by double click,
// with no server. The output folder and the report name come from scripts/run_with_report_common.mjs.
export default defineConfig({
  plugins: {
    awesome: {
      options: {
        singleFile: true,
      },
    },
  },
});
