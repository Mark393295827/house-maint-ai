/**
 * Socket.IO client service
 * Connects to backend real-time events with JWT cookie auth.
 * Backend events: new_message, new_notification, user_typing,
 *   user_stop_typing, new_job_available, job:assigned, job:available,
 *   report:update, report:matched, messages_read
 */
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

/** Initialize socket connection. Call after successful login. */
export function connectSocket(): Socket {
    if (socket?.connected) return socket;

    socket = io(window.location.origin, {
        withCredentials: true,  // sends httpOnly accessToken cookie
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
    });

    return socket;
}

/** Disconnect and clean up. Call on logout. */
export function disconnectSocket(): void {
    socket?.disconnect();
    socket = null;
}

/** Get the current socket instance (null if not connected). */
export function getSocket(): Socket | null {
    return socket;
}

/** Emit typing indicator to a specific user. */
export function emitTyping(toUserId: number): void {
    socket?.emit('typing', { to: toUserId });
}

/** Emit stop-typing indicator to a specific user. */
export function emitStopTyping(toUserId: number): void {
    socket?.emit('stop_typing', { to: toUserId });
}

/** Mark messages from a partner as read (notifies them). */
export function emitMarkRead(partnerId: number): void {
    socket?.emit('mark_read', { partnerId });
}
