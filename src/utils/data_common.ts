import fs from 'fs';
import path from 'path';

// The test data files live in the data folder, next to src and tests.
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');

// Reads a JSON file from the data folder. A missing or broken file stops the run with the file name in the message.
export function readDataFile(fileName: string): unknown {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Test data file ${fileName} is not valid JSON: ${reason}`);
  }
}

// The three readers below check one field and say where the bad value is.
export function readText(row: unknown, key: string, where: string, allowEmpty = false): string {
  const value = (row as Record<string, unknown> | null)?.[key];
  if (typeof value !== 'string' || (!allowEmpty && value.trim() === '')) {
    throw new Error(`${where}: "${key}" must be ${allowEmpty ? 'a string' : 'a non-empty string'}, got ${JSON.stringify(value)}`);
  }
  return value;
}

export function readWholeNumber(row: unknown, key: string, where: string, min: number): number {
  const value = (row as Record<string, unknown> | null)?.[key];
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw new Error(`${where}: "${key}" must be a whole number of at least ${min}, got ${JSON.stringify(value)}`);
  }
  return value;
}

export function readList(value: unknown, where: string): unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where} must be a list with at least one row`);
  }
  return value;
}
