import { defineConfig } from 'allure';

// One HTML file with everything inside (results, steps, screenshots). It opens by double click,
// with no server, so it can be sent or committed as the report of one run.
export default defineConfig({
  name: 'AliExpress cart budget and login tests',
  output: 'submitted-report',
  plugins: {
    awesome: {
      options: {
        singleFile: true,
        reportName: 'AliExpress cart budget and login tests',
      },
    },
  },
});
