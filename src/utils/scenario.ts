import fs from 'fs';
import path from 'path';

export type Scenario = {
  query: string;
  maxPrice: number;
  limit: number;
};

type ScenarioFile = Record<string, Scenario>;

export function loadScenario(): Scenario {
  const profile = process.env.PROFILE || 'demo';
  const file = path.resolve('data/scenarios.json');
  const all = JSON.parse(fs.readFileSync(file, 'utf8')) as ScenarioFile;
  const scenario = all[profile];
  if (!scenario) {
    const names = Object.keys(all).join(', ');
    throw new Error(`Unknown PROFILE "${profile}". Use one of: ${names}`);
  }
  return scenario;
}
