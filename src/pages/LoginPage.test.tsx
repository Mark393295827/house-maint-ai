import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { LanguageProvider } from '../i18n/LanguageContext';

// Mock the API module
vi.mock('../services/api', () => ({
    default: {
        isAuthenticated: vi.fn(() => false),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getCurrentUser: vi.fn(() => Promise.reject(new Error('No active session'))),
        refreshCsrfToken: vi.fn(() => Promise.resolve()),
    }
}));

vi.mock('../services/socket', () => ({
    connectSocket: vi.fn(),
    disconnectSocket: vi.fn(),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => ({ state: null }),
    };
});

const renderLoginPage = () => {
    return render(
        <BrowserRouter>
            <LanguageProvider>
                <ToastProvider>
                    <AuthProvider>
                        <LoginPage />
                    </AuthProvider>
                </ToastProvider>
            </LanguageProvider>
        </BrowserRouter>
    );
};

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem('app_locale', 'zh');
    });

    it('should render the login form by default', async () => {
        renderLoginPage();

        expect(await screen.findByText('欢迎回来')).toBeInTheDocument();
        expect(screen.getByText('登录以继续')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('1xx xxxx xxxx')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Min 8 characters')).toBeInTheDocument();
    });

    it('should render the professional portal entry', async () => {
        renderLoginPage();

        expect(await screen.findByText('专业人员入口')).toBeInTheDocument();
        expect(screen.getByText('师傅端登录')).toBeInTheDocument();
    });

    it('should toggle between login and register modes', async () => {
        renderLoginPage();

        // Initially in login mode
        expect(await screen.findByText('欢迎回来')).toBeInTheDocument();

        // Click to switch to register mode
        fireEvent.click(screen.getByText('没有账号？'));

        // Should now show register mode
        expect(screen.getByText('创建账号')).toBeInTheDocument();
        expect(screen.getByText('加入智能家居维护')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();

        // Click to switch back to login mode
        fireEvent.click(screen.getByText('已有账号？'));

        // Should now show login mode again
        expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    });

    it('should show error for invalid phone number', async () => {
        renderLoginPage();

        const submitButton = await screen.findByRole('button', { name: /登 录/ });
        const phoneInput = await screen.findByPlaceholderText('1xx xxxx xxxx');
        const passwordInput = await screen.findByPlaceholderText('Min 8 characters');

        // Enter invalid phone (not matching Chinese format)
        fireEvent.change(phoneInput, { target: { value: '12345' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('请输入有效的手机号码')).toBeInTheDocument();
        });
    });

    it('should show error for weak password in register mode', async () => {
        renderLoginPage();

        await screen.findByRole('button', { name: /登 录/ });
        fireEvent.click(screen.getByText('没有账号？'));
        const submitButton = await screen.findByRole('button', { name: /注 册/ });
        const phoneInput = await screen.findByPlaceholderText('1xx xxxx xxxx');
        const passwordInput = await screen.findByPlaceholderText('Min 8 characters');
        const nameInput = screen.getByPlaceholderText('Full Name');

        fireEvent.change(phoneInput, { target: { value: '13812345678' } });
        fireEvent.change(passwordInput, { target: { value: '12345' } });
        fireEvent.change(nameInput, { target: { value: 'Test User' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('密码必须至少8位，包含字母和数字')).toBeInTheDocument();
        });
    });

    it('should show error for missing name in register mode', async () => {
        renderLoginPage();

        // Switch to register mode
        await screen.findByRole('button', { name: /登 录/ });
        fireEvent.click(screen.getByText('没有账号？'));

        const submitButton = await screen.findByRole('button', { name: /注 册/ });
        const phoneInput = await screen.findByPlaceholderText('1xx xxxx xxxx');
        const passwordInput = await screen.findByPlaceholderText('Min 8 characters');

        // Enter valid phone and password but no name
        fireEvent.change(phoneInput, { target: { value: '13812345678' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('请输入您的姓名')).toBeInTheDocument();
        });
    });

    it('should toggle password visibility', async () => {
        renderLoginPage();

        const passwordInput = await screen.findByPlaceholderText('Min 8 characters');

        // Initially password is hidden
        expect(passwordInput).toHaveAttribute('type', 'password');

        // Click visibility toggle (find by aria-label or button next to password)
        const toggleButtons = screen.getAllByRole('button');
        const visibilityToggle = toggleButtons.find(
            btn => btn.querySelector('.material-symbols-outlined')?.textContent === 'visibility'
        );

        if (visibilityToggle) {
            fireEvent.click(visibilityToggle);

            // Password should now be visible
            expect(passwordInput).toHaveAttribute('type', 'text');
        }
    });

    it('should have social login buttons', async () => {
        renderLoginPage();

        expect(await screen.findByText('WeChat')).toBeInTheDocument();
        expect(screen.getByText('Alipay')).toBeInTheDocument();
    });

    it('should have a repairman login link', async () => {
        renderLoginPage();

        expect(await screen.findByRole('link', { name: /师傅端登录/ })).toHaveAttribute('href', '/repairman/login');
    });

    it('should only allow digits in phone input', async () => {
        renderLoginPage();

        const phoneInput = await screen.findByPlaceholderText('1xx xxxx xxxx');

        // Try to enter letters - they should be filtered out
        fireEvent.change(phoneInput, { target: { value: 'abc123def456' } });

        // Only digits should remain
        expect(phoneInput).toHaveValue('123456');
    });

    it('should limit phone input to 11 digits', async () => {
        renderLoginPage();

        const phoneInput = await screen.findByPlaceholderText('1xx xxxx xxxx');

        // Try to enter more than 11 digits
        fireEvent.change(phoneInput, { target: { value: '138123456789999' } });

        // Should be limited to 11 digits
        expect(phoneInput).toHaveValue('13812345678');
    });
});
