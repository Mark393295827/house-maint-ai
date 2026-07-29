import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../i18n/LanguageContext';
import { getMessages, sendMessage } from '../services/api';
import { getSocket } from '../services/socket';
import ChatPage from './ChatPage';

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 1, name: 'Consumer' } }),
}));

vi.mock('../services/api', () => ({
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
}));

vi.mock('../services/socket', () => ({
    getSocket: vi.fn(),
    emitMarkRead: vi.fn(),
}));

const listeners = new Map<string, (payload: any) => void>();
const socket = {
    on: vi.fn((event: string, listener: (payload: any) => void) => {
        listeners.set(event, listener);
    }),
    off: vi.fn((event: string) => {
        listeners.delete(event);
    }),
};

const renderChat = (route = '/chat/2?reportId=9') => render(
    <LanguageProvider>
        <MemoryRouter initialEntries={[route]}>
            <Routes>
                <Route path="/chat/:userId" element={<ChatPage />} />
            </Routes>
        </MemoryRouter>
    </LanguageProvider>,
);

describe('ChatPage report scope and realtime delivery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        listeners.clear();
        localStorage.setItem('app_locale', 'en');
        vi.mocked(getSocket).mockReturnValue(socket as unknown as ReturnType<typeof getSocket>);
        vi.mocked(getMessages).mockResolvedValue({ messages: [] });
        vi.mocked(sendMessage).mockResolvedValue({ message: { id: 10 } });
    });

    it('includes the assigned report id required by the backend contract', async () => {
        renderChat();
        await screen.findByText('Send a message to start the conversation');

        fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
            target: { value: 'Is the technician on the way?' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

        await waitFor(() => {
            expect(sendMessage).toHaveBeenCalledWith({
                receiverId: 2,
                content: 'Is the technician on the way?',
                reportId: 9,
            });
        });
    });

    it('renders a new_message socket event and unsubscribes on unmount', async () => {
        const view = renderChat();
        await screen.findByText('Send a message to start the conversation');

        act(() => {
            listeners.get('new_message')?.({
                id: 77,
                sender_id: 2,
                receiver_id: 1,
                sender_name: 'Worker',
                content: 'I am five minutes away.',
                created_at: '2026-07-29T10:00:00.000Z',
            });
        });

        expect(screen.getByText('I am five minutes away.')).toBeInTheDocument();
        view.unmount();
        expect(socket.off).toHaveBeenCalledWith('new_message', expect.any(Function));
    });
});
