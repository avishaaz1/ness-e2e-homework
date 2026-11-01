import { readDataFile, readList, readText, readWholeNumber } from './data_common';

export type Scenario = {
  id: string;
  description: string;
  query: string;
  maxPrice: number;
  limit: number;
};

// The scenarios come from a JSON file in the data folder. Set SCENARIOS_FILE (in the environment
// or the .env file) to run another file with the same ids, for example a smaller smoke set.
export const SCENARIOS_FILE = process.env.SCENARIOS_FILE || 'cart_scenarios.json';

export function parseScenarios(data: unknown, source: string): Scenario[] {
  const ids = new Set<string>();
  return readList(data, source).map((row, index) => {
    const where = `${source} row ${index + 1}`;
    const id = readText(row, 'id', where);
    if (ids.has(id)) throw new Error(`${where}: id "${id}" is used twice`);
    ids.add(id);
    return {
      id,
      description: readText(row, 'description', where),
      query: readText(row, 'query', where),
      // 0 is allowed: a max price of 0 must return an empty list.
      maxPrice: readWholeNumber(row, 'maxPrice', where, 0),
      limit: readWholeNumber(row, 'limit', where, 1),
    };
  });
}

const scenarios = parseScenarios(readDataFile(SCENARIOS_FILE), SCENARIOS_FILE);

export function scenario(id: string): Scenario {
  const found = scenarios.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Scenario "${id}" is not in ${SCENARIOS_FILE}. It has: ${scenarios.map((item) => item.id).join(', ')}`);
  }
  return found;
}

export const fiveItems = scenario('fiveItems');
export const fewerThanFive = scenario('fewerThanFive');
export const noneFound = scenario('noneFound');
export const nextPage = scenario('nextPage');
