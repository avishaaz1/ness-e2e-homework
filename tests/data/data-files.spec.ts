import { expect, test } from '@playwright/test';
import { loginCases, parseLoginCases } from '../../src/utils/login_cases_common';
import { pickRandom } from '../../src/utils/random_common';
import { fiveItems, noneFound, parseScenarios } from '../../src/utils/scenario_common';

// These tests need no browser and no site. They check that the data files are read and that a bad file
// stops the run with a clear message, instead of a confusing failure in the middle of a test.
// They also check the random pick that chooses an item option.
test.describe('Test data files', () => {
  test('the cart scenarios are read with their numbers', () => {
    expect(fiveItems.query, 'the full flow scenario needs something to search').not.toBe('');
    expect(fiveItems.limit).toBeGreaterThan(0);
    expect(noneFound.maxPrice, 'a max price of 0 is a real scenario, so the reader must keep it').toBe(0);
  });

  test('the login cases have one valid account and some refused cases', () => {
    expect(loginCases.valid.username).not.toBe('');
    expect(loginCases.refused.length).toBeGreaterThan(0);
    expect(
      loginCases.refused.some((row) => row.username === ''),
      'the empty username case keeps its empty value',
    ).toBe(true);
  });

  test('a scenario with a negative price is rejected', () => {
    const bad = [{ id: 'x', description: 'd', query: 'shoes', maxPrice: -1, limit: 5 }];
    expect(() => parseScenarios(bad, 'bad.json')).toThrow('"maxPrice" must be a whole number of at least 0');
  });

  test('a scenario without a query is rejected', () => {
    const bad = [{ id: 'x', description: 'd', maxPrice: 10, limit: 5 }];
    expect(() => parseScenarios(bad, 'bad.json')).toThrow('"query" must be a non-empty string');
  });

  test('a repeated scenario id is rejected', () => {
    const row = { id: 'x', description: 'd', query: 'shoes', maxPrice: 10, limit: 5 };
    expect(() => parseScenarios([row, row], 'bad.json')).toThrow('id "x" is used twice');
  });

  test('an empty list of scenarios is rejected', () => {
    expect(() => parseScenarios([], 'bad.json')).toThrow('must be a list with at least one row');
  });

  test('the random pick stays inside the list, at both ends', () => {
    const options = ['small', 'medium', 'large'];
    expect(pickRandom(options, () => 0)).toBe('small');
    expect(pickRandom(options, () => 0.999999)).toBe('large');
    expect(() => pickRandom([])).toThrow('at least one item');
  });

  test('a login case without a message is rejected', () => {
    const bad = {
      valid: { username: 'a', password: 'b' },
      refused: [{ name: 'n', username: 'a', password: 'b' }],
    };
    expect(() => parseLoginCases(bad, 'bad.json')).toThrow('"message" must be a non-empty string');
  });
});
