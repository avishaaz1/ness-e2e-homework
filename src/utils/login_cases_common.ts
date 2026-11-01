import { readDataFile, readList, readText } from './data_common';

export type LoginAccount = { username: string; password: string };
export type RefusedLogin = LoginAccount & { name: string; message: string };
export type LoginCases = { valid: LoginAccount; refused: RefusedLogin[] };

export function parseLoginCases(data: unknown, source: string): LoginCases {
  const root = data as Record<string, unknown> | null;
  return {
    valid: {
      username: readText(root?.valid, 'username', `${source} valid`),
      password: readText(root?.valid, 'password', `${source} valid`),
    },
    refused: readList(root?.refused, `${source} refused`).map((row, index) => {
      const where = `${source} refused row ${index + 1}`;
      return {
        name: readText(row, 'name', where),
        // An empty username or password is a real case, so empty is allowed here.
        username: readText(row, 'username', where, true),
        password: readText(row, 'password', where, true),
        message: readText(row, 'message', where),
      };
    }),
  };
}

// Sauce Demo prints these accounts on its own login page, so they are not secret.
export const LOGIN_CASES_FILE = 'login_cases.json';
export const loginCases = parseLoginCases(readDataFile(LOGIN_CASES_FILE), LOGIN_CASES_FILE);
