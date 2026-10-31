import { stopChrome } from './src/browser/chrome_common';

export default async function globalTeardown(): Promise<void> {
  stopChrome();
}
