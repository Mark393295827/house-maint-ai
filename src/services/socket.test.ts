import { beforeEach, describe, expect, it, vi } from 'vitest';
import { io } from 'socket.io-client';
import { connectSocket, disconnectSocket } from './socket';

const disconnect = vi.fn();
const client = { connected: false, disconnect };

vi.mock('socket.io-client', () => ({
    io: vi.fn(() => client),
}));

describe('socket singleton lifecycle', () => {
    beforeEach(() => {
        disconnectSocket();
        vi.clearAllMocks();
    });

    it('reuses an in-flight connection during duplicate auth bootstrap', () => {
        const first = connectSocket();
        const second = connectSocket();

        expect(first).toBe(second);
        expect(io).toHaveBeenCalledOnce();
    });
});
