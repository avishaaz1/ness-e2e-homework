import { loginCases } from '../../src/utils/login_cases_common';
import { expect, test } from '../fixtures_common';

// The login method is tested on Sauce Demo, a practice shop with no captcha.
// The accounts and the refused cases come from data/login_cases.json. Each refused case says
// who tries, with what password, and what the page should say.
test.describe('Login', () => {
  test('a valid login opens the shop, survives a reload and ends with a logout', async ({ sauce }) => {
    await sauce.login(loginCases.valid.username, loginCases.valid.password);

    await sauce.reload();
    expect(await sauce.isSignedIn(), 'the visitor should still be signed in after a reload').toBe(true);

    await sauce.logout();
    expect(await sauce.isOnLoginPage(), 'after logout the login page should show again').toBe(true);
  });

  for (const refused of loginCases.refused) {
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
