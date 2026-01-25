import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../contexts/AuthContext';

// Mock the API module
vi.mock('../services/api', () => ({
    default: {
        isAuthenticated: vi.fn(() => false),
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        getCurrentUser: vi.fn(),
    }
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
            <AuthProvider>
                <LoginPage />
            </AuthProvider>
        </BrowserRouter>
    );
};

describe('LoginPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the login form by default', () => {
        renderLoginPage();

        expect(screen.getByText('欢迎回来')).toBeInTheDocument();
        expect(screen.getByText('Welcome back')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('手机号码')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    });

    it('should render the app title', () => {
        renderLoginPage();

        expect(screen.getByText('House Maint AI')).toBeInTheDocument();
    });

    it('should toggle between login and register modes', () => {
        renderLoginPage();

        // Initially in login mode
        expect(screen.getByText('欢迎回来')).toBeInTheDocument();

        // Click to switch to register mode
        fireEvent.click(screen.getByText('立即注册'));

        // Should now show register mode
        expect(screen.getByText('创建账号')).toBeInTheDocument();
        expect(screen.getByText('Create your account')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('您的姓名')).toBeInTheDocument();

        // Click to switch back to login mode
        fireEvent.click(screen.getByText('立即登录'));

        // Should now show login mode again
        expect(screen.getByText('欢迎回来')).toBeInTheDocument();
    });

    it('should show error for invalid phone number', async () => {
        renderLoginPage();

        const phoneInput = screen.getByPlaceholderText('手机号码');
        const passwordInput = screen.getByPlaceholderText('密码');
        const submitButton = screen.getByText('登 录');

        // Enter invalid phone (not matching Chinese format)
        fireEvent.change(phoneInput, { target: { value: '12345' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('请输入有效的手机号码')).toBeInTheDocument();
        });
    });

    it('should show error for short password', async () => {
        renderLoginPage();

        const phoneInput = screen.getByPlaceholderText('手机号码');
        const passwordInput = screen.getByPlaceholderText('密码');
        const submitButton = screen.getByText('登 录');

        // Enter valid phone but short password
        fireEvent.change(phoneInput, { target: { value: '13812345678' } });
        fireEvent.change(passwordInput, { target: { value: '12345' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('密码至少需要6位')).toBeInTheDocument();
        });
    });

    it('should show error for missing name in register mode', async () => {
        renderLoginPage();

        // Switch to register mode
        fireEvent.click(screen.getByText('立即注册'));

        const phoneInput = screen.getByPlaceholderText('手机号码');
        const passwordInput = screen.getByPlaceholderText('密码');
        const submitButton = screen.getByText('注 册');

        // Enter valid phone and password but no name
        fireEvent.change(phoneInput, { target: { value: '13812345678' } });
        fireEvent.change(passwordInput, { target: { value: 'password123' } });
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('请输入您的姓名')).toBeInTheDocument();
        });
    });

    it('should toggle password visibility', () => {
        renderLoginPage();

        const passwordInput = screen.getByPlaceholderText('密码');

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

    it('should have social login buttons', () => {
        renderLoginPage();

        expect(screen.getByText('微信')).toBeInTheDocument();
        expect(screen.getByText('支付宝')).toBeInTheDocument();
    });

    it('should have a skip login link', () => {
        renderLoginPage();

        expect(screen.getByText(/跳过登录/)).toBeInTheDocument();
    });

    it('should only allow digits in phone input', () => {
        renderLoginPage();

        const phoneInput = screen.getByPlaceholderText('手机号码');

        // Try to enter letters - they should be filtered out
        fireEvent.change(phoneInput, { target: { value: 'abc123def456' } });

        // Only digits should remain
        expect(phoneInput).toHaveValue('123456');
    });

    it('should limit phone input to 11 digits', () => {
        renderLoginPage();

        const phoneInput = screen.getByPlaceholderText('手机号码');

        // Try to enter more than 11 digits
        fireEvent.change(phoneInput, { target: { value: '138123456789999' } });

        // Should be limited to 11 digits
        expect(phoneInput).toHaveValue('13812345678');
    });
});
