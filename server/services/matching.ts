import db from '../config/database.js';
import type { WorkerWithUser, ReportRow, UserAssetRow } from '../types/models.js';
import { parseJsonColumn } from '../utils/parseJson.js';

export interface MatchScores {
    score: number;
    distanceScore: number;
    ratingScore: number;
    skillScore: number;
    assetScore: number;
}

export interface MatchedWorker extends Omit<WorkerWithUser, 'skills'> {
    skills: string[];       // parsed from JSON text
    score: number;
    distanceScore: number;
    ratingScore: number;
    skillScore: number;
    assetScore: number;
}

/** Weights for the composite match formula */
interface MatchWeights {
    w_skill: number;
    w_rating: number;
    w_geo: number;
    w_speed: number;
}

const DEFAULT_WEIGHTS: MatchWeights = {
    w_skill: 0.4,   // Skill Match (40%)
    w_rating: 0.3,  // Rating History (30%)
    w_geo: 0.2,     // Geo Proximity (20%)
    w_speed: 0.1    // Response Speed (10%)
};

/** Minimal report context needed for matching (avoids requiring a full ReportRow) */
export type MatchReportContext = Pick<ReportRow, 'latitude' | 'longitude' | 'description'> & {
    user_id: number;
    category: string | null;  // Looser than ReportCategory to accept search query values
};

export class MatchingService {
    calculateDistanceScore(workerLat: number | null, workerLng: number | null, userLat: number | null, userLng: number | null, maxDistance = 10): number {
        if (!workerLat || !workerLng || !userLat || !userLng) return 50;

        const R = 6371; // Earth's radius in km
        const dLat = (userLat - workerLat) * Math.PI / 180;
        const dLng = (userLng - workerLng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(workerLat * Math.PI / 180) * Math.cos(userLat * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance >= maxDistance) return 0;
        return Math.round((1 - distance / maxDistance) * 100);
    }

    calculateRatingScore(rating: number): number {
        return Math.round((rating / 5) * 100);
    }

    calculateSkillScore(workerSkills: string[], requiredCategory: string | null): number {
        if (!requiredCategory) return 100;
        return workerSkills.includes(requiredCategory) ? 100 : 0;
    }

    calculateSpeedScore(worker: Pick<WorkerWithUser, 'available'>): number {
        // v1.0 Placeholder: "Response Speed"
        // In full impl, this checks average acceptance time.
        // For MVP, if available=1, give high score.
        return worker.available ? 100 : 50;
    }

    calculateAssetMatchScore(_workerSkills: string[], _reportDescription: string, _userAssets: UserAssetRow[]): number {
        // Kept for metadata but removed from core weighted score in v1.0 spec
        return 0;
    }

    calculateMatchScore(worker: WorkerWithUser, report: MatchReportContext, userAssets: UserAssetRow[] = [], weights: MatchWeights = DEFAULT_WEIGHTS): MatchScores {
        const skills = parseJsonColumn<string[]>(worker.skills, []);

        const D = this.calculateDistanceScore(
            worker.latitude, worker.longitude,
            report.latitude, report.longitude
        );
        const R = this.calculateRatingScore(worker.rating);
        const S = this.calculateSkillScore(skills, report.category);
        const Speed = this.calculateSpeedScore(worker);

        // Asset score calculated but not used in weighted sum per v1.0 spec
        const A = this.calculateAssetMatchScore(skills, report.description, userAssets);

        // OpenClaw v1.0 Formula
        const score = Math.round(
            (weights.w_skill * S) +
            (weights.w_rating * R) +
            (weights.w_geo * D) +
            (weights.w_speed * Speed)
        );

        return {
            score,
            distanceScore: D,
            ratingScore: R,
            skillScore: S,
            assetScore: A
        };
    }

    async findTopMatches(report: MatchReportContext, limit: number = 5): Promise<MatchedWorker[]> {
        // Get available workers
        const { rows: workers } = await db.query<WorkerWithUser>(`
            SELECT w.*, u.name, u.phone, u.avatar
            FROM workers w
            JOIN users u ON w.user_id = u.id
            WHERE w.available = 1
        `);

        // Get User Assets
        const { rows: userAssets } = await db.query<UserAssetRow>('SELECT * FROM user_assets WHERE user_id = $1', [report.user_id]);

        // Calculate match scores
        const matchedWorkers: MatchedWorker[] = workers.map(worker => {
            const scores = this.calculateMatchScore(worker, report, userAssets);
            const skills = parseJsonColumn<string[]>(worker.skills, []);

            return {
                ...worker,
                skills,
                ...scores
            };
        });

        // Sort by score descending
        matchedWorkers.sort((a, b) => b.score - a.score);

        return matchedWorkers.slice(0, limit);
    }
}

export const matchingService = new MatchingService();
