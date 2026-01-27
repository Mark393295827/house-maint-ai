export { publicEnv as env } from "./env";

class APIClient {
    private baseURL: string;
    private token: string | null = null;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    setToken(token: string) {
        this.token = token;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const headers: HeadersInit = {
            "Content-Type": "application/json",
            ...options.headers,
        };

        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `Request failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Auth endpoints
    async register(data: {
        email: string;
        password: string;
        name: string;
        role: "user" | "worker";
    }) {
        return this.request<{ token: string; user: any }>("/auth/register", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async login(data: { email: string; password: string }) {
        return this.request<{ token: string; user: any }>("/auth/login", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    // Reports endpoints
    async createReport(formData: FormData) {
        const headers: HeadersInit = {};
        if (this.token) {
            headers["Authorization"] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseURL}/reports`, {
            method: "POST",
            headers,
            body: formData,
        });

        if (!response.ok) {
            throw new Error("Failed to create report");
        }

        return response.json();
    }

    async getReports() {
        return this.request<{ reports: any[] }>("/reports");
    }

    async getReport(id: string) {
        return this.request<{ report: any }>(`/reports/${id}`);
    }

    // Workers endpoints
    async searchWorkers(params: {
        specialty?: string;
        lat?: number;
        lng?: number;
        radius?: number;
    }) {
        const query = new URLSearchParams(
            Object.entries(params)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
        );
        return this.request<{ workers: any[] }>(`/workers/search?${query}`);
    }

    async getWorker(id: string) {
        return this.request<{ worker: any }>(`/workers/${id}`);
    }
}

export const apiClient = new APIClient(
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787"
);
