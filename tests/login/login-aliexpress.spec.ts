import { credentials, WRONG_PASSWORD } from '../../src/config/credentials_common';
import { expect, test } from '../fixtures_common';

// The same login cases, on AliExpress itself. This file shows the attempt and the known blocker.
//
// The blocker: after the password is sent, AliExpress shows a slider ("Please slide to verify")
// in automated runs. A person does not get it. The tests do not try to get around it. When the
// slider appears, the run prints a message and waits up to 2 minutes for someone to drag it.
// Without a person, the two account tests fail at that step, so they are skipped unless an
// account is set in the .env file (ALI_USERNAME and ALI_PASSWORD). The full login cases run
// without a captcha in login.spec.ts, on Sauce Demo.
test.describe('Login on AliExpress', () => {
  test('Continue stays off while the username field is empty', async ({ shop }) => {
    try {
      await shop.openSignInForm();
    } catch (error) {
      // Sometimes AliExpress puts its robot check over the home page, a few seconds after it loads.
      // The sign in form cannot be reached then, and this test has nothing to check, so it is skipped
      // with the reason. Any other failure is still a failure.
      test.skip(
        await shop.isCaptchaCoveringPage(),
        'AliExpress showed its robot check over the home page, so the sign in form could not be opened. A person has to solve it.',
      );
      throw error;
    }

    expect(await shop.isContinueEnabled(), 'Continue should be off before anything is typed').toBe(false);
  });

  test.describe('with the test account (needs a person for the captcha)', () => {
    test.skip(
      !credentials.username || !credentials.password,
      'Set ALI_USERNAME and ALI_PASSWORD (in the environment or the .env file) to run these tests',
    );

    test.beforeEach(() => {
      test.info().annotations.push({
        type: 'captcha',
        description: 'Drag the slider in the browser window when it appears. The run waits up to 2 minutes.',
      });
    });

    test('a wrong password is refused and the visitor stays signed out', async ({ shop }) => {
      const result = await shop.attemptLogin(credentials.username, WRONG_PASSWORD);

      expect(result.signedIn, 'a wrong password should not sign anybody in').toBe(false);
      expect(result.error, 'the page should say why the login was refused').not.toBe('');
    });

    test('a valid login stays after a reload and ends with a logout', async ({ shop }) => {
      await shop.login(credentials.username, credentials.password);

      await shop.reload();
      expect(await shop.isSignedIn(), 'the visitor should still be signed in after a reload').toBe(true);

      await shop.logout();
    });
  });
});
