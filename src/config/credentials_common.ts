// ALI_LOGIN=off ignores the AliExpress account, even when it is set in .env. The two tests that need
// it are then skipped, for a run that must not wait for a person to solve the captcha.
const accountOff = process.env.ALI_LOGIN === 'off';

// AliExpress login details come from the environment (or the .env file), never from the code.
// The Sauce Demo accounts are in data/login_cases.json. That site prints them on its login page.
export const credentials = {
  username: accountOff ? '' : (process.env.ALI_USERNAME ?? ''),
  password: accountOff ? '' : (process.env.ALI_PASSWORD ?? ''),
};

// A password no account has. Used to check that a refused login stays signed out.
export const WRONG_PASSWORD = 'not-the-password-123';
