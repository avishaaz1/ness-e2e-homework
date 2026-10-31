import { startChrome } from './src/browser/chrome_common';

export default async function globalSetup(): Promise<void> {
  await startChrome();
}
