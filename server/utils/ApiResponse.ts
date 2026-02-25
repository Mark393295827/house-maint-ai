/**
 * Standard API Response Wrapper
 */
export class ApiResponse {
    static success<T>(data: T, message?: string) {
        return {
            status: 'success',
            message,
            data
        };
    }

    static fail(error: string, details?: any) {
        return {
            status: 'fail',
            error,
            details
        };
    }
}
