import { query, isSQLite } from '../config/database.js';

interface DashboardStats {
    activeTickets: number;
    availableWorkers: number;
    pendingApprovals: number;
    satisfaction: number;
}

interface TicketTrend {
    date: string;
    count: number;
}

interface WorkerPerformance {
    id: number;
    name: string;
    rating: number;
    totalJobs: number;
}

class AnalyticsService {
    /**
     * Get aggregate stats for the enterprise dashboard
     */
    async getDashboardStats(): Promise<DashboardStats> {
        // Active Tickets: pending, matching, matched, or in_progress
        const activeTicketsResult = await query(
            `SELECT COUNT(*) as count FROM reports WHERE status IN ('pending', 'matching', 'matched', 'in_progress')`
        );

        // Available Workers
        const availableWorkersResult = await query(
            `SELECT COUNT(*) as count FROM workers WHERE available = 1`
        );

        // Pending Approvals (assuming 'pending' status requires approval/action)
        const pendingApprovalsResult = await query(
            `SELECT COUNT(*) as count FROM reports WHERE status = 'pending'`
        );

        // Average Satisfaction (from reviews)
        const satisfactionResult = await query(
            `SELECT AVG(rating) as avg_rating FROM reviews`
        );

        return {
            activeTickets: activeTicketsResult.rows[0].count,
            availableWorkers: availableWorkersResult.rows[0].count,
            pendingApprovals: pendingApprovalsResult.rows[0].count,
            satisfaction: parseFloat(satisfactionResult.rows[0].avg_rating?.toFixed(1) || '0')
        };
    }

    /**
     * Get ticket volume trend for the last 7 days
     */
    async getTicketTrend(): Promise<TicketTrend[]> {
        // SQLite uses strftime, Postgres uses to_char. 
        const sql = isSQLite
            ? `SELECT date(created_at) as date, COUNT(*) as count 
               FROM reports 
               WHERE created_at >= date('now', '-7 days') 
               GROUP BY date(created_at) 
               ORDER BY date(created_at)`
            : `SELECT to_char(created_at, 'YYYY-MM-DD') as date, COUNT(*) as count 
               FROM reports 
               WHERE created_at >= NOW() - INTERVAL '7 days' 
               GROUP BY date 
               ORDER BY date`;

        const result = await query(sql);
        return result.rows;
    }

    /**
     * Get top performing workers
     */
    async getTopWorkers(limit: number = 5): Promise<WorkerPerformance[]> {
        const sql = `
            SELECT w.id, u.name, w.rating, w.total_jobs
            FROM workers w
            JOIN users u ON w.user_id = u.id
            ORDER BY w.rating DESC, w.total_jobs DESC
            LIMIT $1
        `;

        const result = await query(sql, [limit]);
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            rating: row.rating,
            totalJobs: row.total_jobs
        }));
    }
}

export const analyticsService = new AnalyticsService();
