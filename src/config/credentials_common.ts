// AliExpress login details come from the environment (or the .env file), never from the code.
export const credentials = {
  username: process.env.ALI_USERNAME ?? '',
  password: process.env.ALI_PASSWORD ?? '',
};

// A password no account has. Used to check that a refused login stays signed out.
export const WRONG_PASSWORD = 'not-the-password-123';

// Sauce Demo prints these accounts on its own login page, so they are not secret.
export const sauceUsers = {
  standard: 'standard_user',
  lockedOut: 'locked_out_user',
  unknown: 'nobody_user',
  password: 'secret_sauce',
};
