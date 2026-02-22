import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from './middleware/auth.js';

export let io: Server;

export const initSocket = (httpServer: HttpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGINS?.split(',') || ["http://localhost:5173"],
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            // Support Auth via Cookie or Header
            // socket.request is an IncomingMessage, we need to parse cookies manually or use a library
            // For simplicity, let's look at the handshake headers
            const cookieHeader = socket.handshake.headers.cookie;
            let token = '';

            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {} as any);
                token = cookies['accessToken'];
            }

            // Fallback to handshake auth object
            if (!token && socket.handshake.auth?.token) {
                token = socket.handshake.auth.token;
            }

            if (!token) {
                return next(new Error('Authentication error'));
            }

            const decoded = verifyToken(token);
            if (!decoded) {
                return next(new Error('Authentication error'));
            }

            socket.data.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.data.user.id})`);

        // Join user-specific room
        const userId = socket.data.user.id;
        socket.join(`user:${userId}`);

        if (socket.data.user.role === 'worker') {
            socket.join('workers');
        }

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });

        // Real-time messaging events
        socket.on('typing', (data: { to: number }) => {
            io.to(`user:${data.to}`).emit('user_typing', {
                userId: socket.data.user.id,
                name: socket.data.user.name,
            });
        });

        socket.on('stop_typing', (data: { to: number }) => {
            io.to(`user:${data.to}`).emit('user_stop_typing', {
                userId: socket.data.user.id,
            });
        });

        socket.on('mark_read', (data: { partnerId: number }) => {
            io.to(`user:${data.partnerId}`).emit('messages_read', {
                by: socket.data.user.id,
            });
        });
    });

    return io;
};

// Helper to emit events
export const emitToUser = (userId: number, event: string, data: any) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

export const emitToWorkers = (event: string, data: any) => {
    if (io) {
        io.to('workers').emit(event, data);
    }
};
