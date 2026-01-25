import pg from 'pg';
import dotenv from 'dotenv';
import { DB_PASSWORD } from './secrets.js';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'house_maint',
    password: DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

// Test connection
pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export default pool;
