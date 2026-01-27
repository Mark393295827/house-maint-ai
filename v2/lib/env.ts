import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXTAUTH_URL: z.string().url(),
    NEXTAUTH_SECRET: z.string().min(32, "NextAuth secret must be at least 32 characters"),
    NEXT_PUBLIC_API_URL: z.string().url(),
    API_URL: z.string().url(),
    GEMINI_API_KEY: z.string().optional(),
    OLLAMA_URL: z.string().url().optional(),
});

export const env = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    API_URL: process.env.API_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OLLAMA_URL: process.env.OLLAMA_URL,
});

// Export public env variables for client components
export const publicEnv = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL!,
};
