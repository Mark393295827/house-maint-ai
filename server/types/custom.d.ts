import 'express';

declare module 'express' {
    interface Request {
        user?: {
            id: number;
            phone: string;
            name: string;
            role: string;
        };
    }
}
