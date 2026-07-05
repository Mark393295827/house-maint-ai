import { Page, Locator } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly phoneInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly toggleModeButton: Locator;
    readonly errorMessage: Locator;
    readonly title: Locator;
    readonly nameInput: Locator;

    constructor(page: Page) {
        this.page = page;
        this.phoneInput = page.getByPlaceholder('1xx xxxx xxxx');
        this.passwordInput = page.getByPlaceholder('Min 8 characters');
        this.submitButton = page.locator('button[type="submit"]');
        this.toggleModeButton = page.locator('button', { hasText: /没有账号？|已有账号？/ });
        this.errorMessage = page.locator('form p');
        this.title = page.locator('h1');
        this.nameInput = page.getByPlaceholder('Full Name');
    }

    async goto() {
        await this.page.addInitScript(() => {
            localStorage.setItem('app_locale', 'zh');
        });
        await this.page.goto('/login');
        await this.page.waitForLoadState('networkidle');
    }

    async login(phone: string, pass: string) {
        await this.phoneInput.fill(phone);
        await this.passwordInput.fill(pass);
        await this.submitButton.click();
    }

    async switchToRegister() {
        const text = await this.toggleModeButton.innerText();
        if (text.includes('没有账号')) {
            await this.toggleModeButton.click();
        }
    }

    async switchToLogin() {
        const text = await this.toggleModeButton.innerText();
        if (text.includes('已有账号')) {
            await this.toggleModeButton.click();
        }
    }
}
