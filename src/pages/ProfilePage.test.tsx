import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { LanguageProvider } from '../i18n/LanguageContext';
import { AuthProvider } from '../contexts/AuthContext';
import api from '../services/api';

// Mock the API module
vi.mock('../services/api', () => {
    const mockApi = {
        getReports: vi.fn(),
        updateProfile: vi.fn(),
        logout: vi.fn(),
        getCurrentUser: vi.fn(),
        isAuthenticated: vi.fn(),
        login: vi.fn(),
        register: vi.fn(),
    };
    return {
        ...mockApi,
        default: mockApi
    };
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const mockUser = {
    id: 1,
    name: 'Test User',
    phone: '13812345678',
    role: 'user'
};

const mockReports = [
    { id: 101, title: 'Leaky Pipe', status: 'pending', created_at: new Date().toISOString() },
    { id: 102, title: 'Broken AC', status: 'completed', created_at: new Date().toISOString() },
];

const renderProfilePage = () => {
    return render(
        <LanguageProvider>
            <BrowserRouter>
                <AuthProvider>
                    <ProfilePage />
                </AuthProvider>
            </BrowserRouter>
        </LanguageProvider>
    );
};

describe('ProfilePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock for getCurrentUser to have a logged in user
        (api.getCurrentUser as any).mockResolvedValue({ user: mockUser });
        (api.getReports as any).mockResolvedValue({ reports: mockReports });

        // Mock window.matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(), // deprecated
                removeListener: vi.fn(), // deprecated
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // Reset document classes
        document.documentElement.className = '';
        localStorage.clear();
    });

    it('should render user profile information', async () => {
        renderProfilePage();

        await waitFor(() => {
            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('13812345678')).toBeInTheDocument();
        });
    });

    it('should render recent reports', async () => {
        renderProfilePage();

        await waitFor(() => {
            expect(screen.getByText('Leaky Pipe')).toBeInTheDocument();
            expect(screen.getByText('Broken AC')).toBeInTheDocument();
        });
    });

    it('should enter edit mode and save new name', async () => {
        (api.updateProfile as any).mockResolvedValue({ user: { ...mockUser, name: 'Updated Name' } });
        renderProfilePage();

        // Wait for user data to load and click edit button
        const editButton = await screen.findByText(/Edit/i);
        fireEvent.click(editButton);

        // Find input and change value
        const input = await screen.findByPlaceholderText(/Your Name/i);
        fireEvent.change(input, { target: { value: 'Updated Name' } });

        // Click save button
        const saveButton = screen.getByText(/Save/i);
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(api.updateProfile).toHaveBeenCalledWith('Updated Name', undefined);
            expect(screen.getByText('Updated Name')).toBeInTheDocument();
        });
    });

    it('should toggle dark mode', async () => {
        renderProfilePage();

        // Find dark mode toggle text
        const darkModeText = await screen.findByText(/Dark Mode/i);
        const toggleContainer = darkModeText.closest('div[class*="flex items-center justify-between"]');

        if (!toggleContainer) throw new Error('Could not find toggle container');

        fireEvent.click(toggleContainer);

        // Verify class was added to documentElement
        expect(document.documentElement.classList.contains('dark')).toBe(true);
        expect(localStorage.getItem('theme')).toBe('dark');

        fireEvent.click(toggleContainer);
        expect(document.documentElement.classList.contains('dark')).toBe(false);
        expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should call logout and navigate to login', async () => {
        (api.logout as any).mockResolvedValue({ success: true });
        renderProfilePage();

        const logoutButton = await screen.findByText(/Log Out/i);
        fireEvent.click(logoutButton);

        await waitFor(() => {
            expect(api.logout).toHaveBeenCalled();
            expect(mockNavigate).toHaveBeenCalledWith('/login');
        });
    });
});
