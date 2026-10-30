import { stopChrome } from './src/browser/chrome';

export default async function globalTeardown(): Promise<void> {
  stopChrome();
}
