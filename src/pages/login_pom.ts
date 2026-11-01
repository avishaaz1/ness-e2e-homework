import { expect, type Locator, type Page } from '@playwright/test';
import { PAGE_READY_TIMEOUT } from '../config/site_common';
import { log } from '../utils/logger_common';

// Every selector on this page. Change one here and the page object follows.
// The page language follows the visitor's country, so these avoid text labels.
// All of them were checked on the live site except where the comment says otherwise.
const LOGIN_SELECTORS = {
  identityInput: 'input.cosmos-input',
  continueButton: 'button.cosmos-btn-primary',
  verificationCodeInput: 'input[autocomplete="one-time-code"]',
  passwordInput: 'input[type="password"]',
  emailSuggestionList: '[role="listbox"]',
  // Accessible name of the email button in the options version of the dialog. Clicking it opens the email field.
  emailOptionName: 'init',
  // The slider captcha that AliExpress shows after the password is submitted.
  captchaFrame: '#baxia-dialog-content',
  // What can cover the page when AliExpress checks for a robot, so that no click or hover reaches it.
  // The slider has a mask layer. The "I'm not a robot" box (reCAPTCHA) is an iframe inside a middleware widget.
  captchaOverlay: '.baxia-dialog-mask, .J_MIDDLEWARE_FRAME_WIDGET iframe',
  // Seen with the captcha message ("Please slide to verify"). The wrong password message was not checked.
  errorMessage: '[class*="error"]',
};

const LOGIN_RESULT_TIMEOUT = 30_000;
// Time a person gets to drag the captcha slider.
const CAPTCHA_SOLVE_TIMEOUT = 120_000;
const CAPTCHA_APPEAR_TIMEOUT = 8_000;
// How long to wait for the email suggestion before moving on without it.
const SUGGESTION_TIMEOUT = 3_000;

export class LoginPage {
  private readonly identityInput: Locator;
  private readonly continueButton: Locator;
  private readonly verificationCodeInput: Locator;
  private readonly passwordInput: Locator;
  private readonly emailSuggestionList: Locator;
  private readonly captchaFrame: Locator;
  private readonly captchaOverlay: Locator;
  private readonly errorMessage: Locator;

  constructor(private readonly page: Page) {
    this.identityInput = page.locator(LOGIN_SELECTORS.identityInput);
    this.continueButton = page.locator(LOGIN_SELECTORS.continueButton);
    this.verificationCodeInput = page.locator(LOGIN_SELECTORS.verificationCodeInput);
    this.passwordInput = page.locator(LOGIN_SELECTORS.passwordInput);
    this.emailSuggestionList = page.locator(LOGIN_SELECTORS.emailSuggestionList);
    this.captchaFrame = page.locator(LOGIN_SELECTORS.captchaFrame);
    this.captchaOverlay = page.locator(LOGIN_SELECTORS.captchaOverlay);
    this.errorMessage = page.locator(LOGIN_SELECTORS.errorMessage);
  }

  // Both steps in a row. Stops after the password is submitted.
  async signIn(username: string, password: string): Promise<void> {
    await this.enterUsername(username);
    await this.enterPassword(password);
  }

  // Step 1: email or phone, then Continue. Ends on the password step.
  async enterUsername(username: string): Promise<void> {
    await this.waitForForm();
    await this.identityInput.first().fill(username);
    await this.pickEmailSuggestion(username);
    await expect(this.continueButton.first(), 'Continue should turn on once a username is typed').toBeEnabled();
    await this.continueButton.first().click();

    // The site decides the second step: a password field, or a code sent by email or SMS.
    await expect(
      this.passwordInput.or(this.verificationCodeInput).first(),
      'after Continue, the sign in form should ask for a password or a verification code',
    ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });

    const askedForCode = await this.verificationCodeInput.first().isVisible();
    expect(
      askedForCode,
      `the site asked for a verification code instead of a password for "${username}". ` +
        'This happens when the account does not exist or the site wants a one-time code. A code cannot be automated.',
    ).toBe(false);
  }

  // Step 2: password, then Enter.
  async enterPassword(password: string): Promise<void> {
    await this.passwordInput.first().fill(password);
    await this.passwordInput.first().press('Enter');
  }

  // Whether Continue can be pressed right now. Used to check the empty field case.
  async isContinueEnabled(): Promise<boolean> {
    await this.waitForForm();
    return this.continueButton.first().isEnabled();
  }

  // AliExpress may show a slider captcha. A person has to drag it, so the run waits here.
  // It can cover the whole page, even before anyone signs in, so the flow also calls this first.
  async waitForCaptchaToBeSolved(appearTimeout = CAPTCHA_APPEAR_TIMEOUT): Promise<void> {
    if (!(await this.isCaptchaShown(appearTimeout))) return;

    log.info(`captcha shown. Drag the slider in the browser window within ${CAPTCHA_SOLVE_TIMEOUT / 1000} seconds`);
    const message = 'the captcha slider was not solved in time. A person has to drag it in the browser window.';
    await expect(this.captchaFrame.first(), message).toBeHidden({ timeout: CAPTCHA_SOLVE_TIMEOUT });
    await expect(this.captchaOverlay.first(), message).toBeHidden({ timeout: CAPTCHA_SOLVE_TIMEOUT });
  }

  // True when the captcha, or the layer it puts over the page, shows up within the wait.
  async isCaptchaShown(timeout = CAPTCHA_APPEAR_TIMEOUT): Promise<boolean> {
    return this.captchaFrame
      .or(this.captchaOverlay)
      .first()
      .waitFor({ state: 'visible', timeout })
      .then(() => true)
      .catch(() => false);
  }

  // Waits for the sign in attempt to end: the form closes (success) or an error shows (failure).
  // Returns after LOGIN_RESULT_TIMEOUT if neither happens.
  async waitForOutcome(): Promise<void> {
    const closed = this.identityInput.first().waitFor({ state: 'hidden', timeout: LOGIN_RESULT_TIMEOUT });
    const failed = this.errorMessage.first().waitFor({ state: 'visible', timeout: LOGIN_RESULT_TIMEOUT });
    await Promise.any([closed, failed]).catch(() => undefined);
  }

  // True while the sign in form is still on the page.
  async isFormOpen(): Promise<boolean> {
    return this.identityInput.first().isVisible();
  }

  // Text of any error shown on the page, for the result and the failure message.
  async errorText(): Promise<string> {
    const texts = await this.errorMessage.allInnerTexts().catch(() => []);
    return texts.map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
  }

  // The site shows the sign in dialog in two versions. One has the email field right away.
  // The other first offers ways to continue, and its email button (named "init") opens the field.
  private async waitForForm(): Promise<void> {
    const emailOption = this.page
      .getByRole('dialog')
      .getByRole('button', { name: LOGIN_SELECTORS.emailOptionName, exact: true })
      .first();
    await expect(
      this.identityInput.first().or(emailOption),
      'the sign in dialog should show the email field or the email option',
    ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });

    if (!(await this.identityInput.first().isVisible())) {
      log.info('sign in dialog opened with the options version, choosing email');
      await emailOption.click();
    }
    await expect(
      this.identityInput.first(),
      'the sign in form should show the email or phone field',
    ).toBeVisible({ timeout: PAGE_READY_TIMEOUT });
  }

  // Typing an email opens a suggestion list under the field that sits on top of Continue.
  // Its only entry is the same text that was typed, so picking it changes nothing and closes the list.
  // A phone number gets no suggestion, so nothing happens then.
  private async pickEmailSuggestion(username: string): Promise<void> {
    const suggestion = this.emailSuggestionList.getByRole('listitem', { name: username, exact: true });
    const shown = await suggestion
      .waitFor({ state: 'visible', timeout: SUGGESTION_TIMEOUT })
      .then(() => true)
      .catch(() => false);
    if (shown) await suggestion.click();
  }
}
