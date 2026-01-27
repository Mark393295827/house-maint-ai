import { neon } from '@neondatabase/serverless';
import type { Env } from '../index';

export class Database {
    private sql: ReturnType<typeof neon>;

    constructor(databaseUrl: string) {
        this.sql = neon(databaseUrl);
    }

    async query<T = any>(query: string, params: any[] = []): Promise<T[]> {
        return this.sql(query, params) as Promise<T[]>;
    }

    async queryOne<T = any>(query: string, params: any[] = []): Promise<T[] | null> {
        const results = await this.query<T>(query, params);
        return results[0] || null;
    }

    async execute(query: string, params: any[] = []): Promise<void> {
        await this.sql(query, params);
    }
}

export function getDb(env: Env): Database {
    return new Database(env.DATABASE_URL);
}
