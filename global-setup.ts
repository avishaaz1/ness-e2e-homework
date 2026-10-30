import { startChrome } from './src/browser/chrome';

export default async function globalSetup(): Promise<void> {
  await startChrome();
}
