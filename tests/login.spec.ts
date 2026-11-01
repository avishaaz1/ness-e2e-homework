import { sauceUsers } from '../src/config/credentials_common';
import { expect, test } from './fixtures_common';

// The login method is tested on Sauce Demo, a practice shop with no captcha.
// Each refused case is one row: who tries, with what password, and what the page should say.
const refusedLogins = [
  {
    name: 'a wrong password',
    username: sauceUsers.standard,
    password: 'not-the-password-123',
    message: 'Username and password do not match any user in this service',
  },
  {
    name: 'an unknown username',
    username: sauceUsers.unknown,
    password: sauceUsers.password,
    message: 'Username and password do not match any user in this service',
  },
  {
    name: 'a locked out user',
    username: sauceUsers.lockedOut,
    password: sauceUsers.password,
    message: 'this user has been locked out',
  },
  {
    name: 'an empty username',
    username: '',
    password: sauceUsers.password,
    message: 'Username is required',
  },
  {
    name: 'an empty password',
    username: sauceUsers.standard,
    password: '',
    message: 'Password is required',
  },
];

test.describe('Login', () => {
  test('a valid login opens the shop, survives a reload and ends with a logout', async ({ sauce }) => {
    await sauce.login(sauceUsers.standard, sauceUsers.password);

    await sauce.reload();
    expect(await sauce.isSignedIn(), 'the visitor should still be signed in after a reload').toBe(true);

    await sauce.logout();
    expect(await sauce.isOnLoginPage(), 'after logout the login page should show again').toBe(true);
  });

  for (const refused of refusedLogins) {
    test(`${refused.name} is refused and says why`, async ({ sauce }) => {
      const result = await sauce.attemptLogin(refused.username, refused.password);

      expect(result.signedIn, 'a refused login should not sign anybody in').toBe(false);
      expect(result.error, 'the page should explain why the login was refused').toContain(refused.message);
      expect(await sauce.isOnLoginPage(), 'the visitor should stay on the login page').toBe(true);
    });
  }

  test('the shop cannot be opened by address without logging in', async ({ sauce }) => {
    const error = await sauce.openProductPageDirectly();

    expect(error, 'the site should say the page needs a login').toContain('when you are logged in');
    expect(await sauce.isSignedIn(), 'nobody should be signed in').toBe(false);
  });
});
