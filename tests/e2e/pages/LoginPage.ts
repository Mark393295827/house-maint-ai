import { Page, Locator } from '@playwright/test';

export class LoginPage {
    readonly page: Page;
    readonly phoneInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;
    readonly toggleModeButton: Locator;
    readonly errorMessage: Locator;
    readonly title: Locator;

    constructor(page: Page) {
        this.page = page;
        this.phoneInput = page.getByPlaceholder('手机号码');
        this.passwordInput = page.getByPlaceholder('密码');
        this.submitButton = page.locator('button[type="submit"]');
        this.toggleModeButton = page.locator('button', { hasText: /立即注册|立即登录/ });
        this.errorMessage = page.locator('.text-red-600.dark\\:text-red-400');
        this.title = page.locator('h2');
    }

    async goto() {
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
        if (text.includes('立即注册')) {
            await this.toggleModeButton.click();
        }
    }

    async switchToLogin() {
        const text = await this.toggleModeButton.innerText();
        if (text.includes('立即登录')) {
            await this.toggleModeButton.click();
        }
    }
}
