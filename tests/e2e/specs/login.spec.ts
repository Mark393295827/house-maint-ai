import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test.describe('Login Flow', () => {
    let loginPage: LoginPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        await loginPage.goto();
    });

    test('should display login form by default', async ({ page }) => {
        await expect(loginPage.title).toHaveText('欢迎回来');
        await expect(loginPage.phoneInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.submitButton).toHaveText(/登 录/);
    });

    test('should show validation error for invalid phone', async ({ page }) => {
        await loginPage.login('123', 'password123');
        await expect(loginPage.errorMessage).toContainText('请输入有效的手机号码');
    });

    test('should show validation error for short password', async ({ page }) => {
        await loginPage.login('13800138000', '123');
        await expect(loginPage.errorMessage).toContainText('密码至少需要6位');
    });

    test('should toggle between login and register', async ({ page }) => {
        // Initial state: Login
        await expect(loginPage.title).toHaveText('欢迎回来');

        // Switch to Register
        await loginPage.switchToRegister();
        await expect(loginPage.title).toHaveText('创建账号');
        await expect(loginPage.submitButton).toHaveText(/注 册/);

        // Switch back to Login
        await loginPage.switchToLogin();
        await expect(loginPage.title).toHaveText('欢迎回来');
    });
});
