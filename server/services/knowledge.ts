import { eq, sql, and, desc, gte } from 'drizzle-orm';
import { knowledgeEntries, materialPriceObservations, failurePatterns, workerSkillCalibration } from '../db/ontology.js';

/**
 * ============================================================
 * Knowledge Accumulation Service (知识积累服务)
 * ============================================================
 *
 * This service is the "flywheel" of the data ontology.
 * Every repair job feeds back proprietary knowledge that makes the AI smarter.
 *
 * Flywheel:
 *   1. AI diagnoses → generates initial knowledge hypothesis
 *   2. Worker executes repair → confirms/refutes hypothesis
 *   3. Feedback loop → increases/decreases confidence score
 *   4. Next AI diagnosis uses accumulated knowledge → better prediction
 *
 * This is the moat. After 1000 repairs, no competitor can replicate
 * our Sanya-specific building + climate + material knowledge.
 */

export class KnowledgeAccumulationService {

    /**
     * Record a knowledge entry from a completed repair.
     * Called after every successful job to accumulate private data.
     */
    async recordKnowledge(entry: {
        category: string;
        subcategory?: string;
        title: string;
        content: string;
        source: string;
        regionCode?: string;
        buildingType?: string;
        tags?: string[];
        contributorId?: number;
        linkedReportId?: number;
    }): Promise<{ id: number; confidence: number }> {
        // Check if similar knowledge already exists
        // If so, increment validation count and boost confidence
        console.log(`[Ontology] Recording knowledge: "${entry.title}" (${entry.category})`);

        // Mock: In production, use db.insert()
        const newId = Date.now();
        const confidence = 0.5; // Starts neutral

        return { id: newId, confidence };
    }

    /**
     * Record observed material price from the field.
     * Feeds the "private pricing oracle" that competitors cannot replicate.
     */
    async recordMaterialPrice(observation: {
        materialName: string;
        materialCategory: string;
        brand?: string;
        specification?: string;
        observedPrice: number;
        unit: string;
        supplierName?: string;
        aiPredictedPrice?: number;
        reportId?: number;
    }): Promise<{ priceAccuracy: number; ontologySize: number }> {
        const accuracy = observation.aiPredictedPrice
            ? 1 - Math.abs(1 - observation.aiPredictedPrice / observation.observedPrice)
            : 0;

        console.log(
            `[Ontology] Material price recorded: ${observation.materialName} ` +
            `Observed: ¥${observation.observedPrice}/${observation.unit} ` +
            `${observation.aiPredictedPrice ? `AI predicted: ¥${observation.aiPredictedPrice} (accuracy: ${(accuracy * 100).toFixed(1)}%)` : ''}`
        );

        return { priceAccuracy: accuracy, ontologySize: 0 };
    }

    /**
     * Record failure pattern correlation from a completed diagnosis.
     * Builds the predictive maintenance brain over time.
     */
    async recordFailurePattern(pattern: {
        component: string;
        failureMode: string;
        buildingAge?: number;
        buildingType?: string;
        climateFactor?: string;
        repairCost?: number;
        repairHours?: number;
        preventable?: boolean;
        preventionMethod?: string;
    }): Promise<void> {
        const month = new Date().getMonth() + 1;
        console.log(
            `[Ontology] Failure pattern recorded: ${pattern.component} → ${pattern.failureMode} ` +
            `(Month: ${month}, Climate: ${pattern.climateFactor || 'unknown'})`
        );
    }

    /**
     * Calibrate worker skill profile after a completed job.
     * This creates the "worker reliability score" moat.
     */
    async calibrateWorkerSkill(data: {
        workerId: number;
        skillCategory: string;
        wasSuccessful: boolean;
        completionMinutes: number;
        customerRating: number;
        actualCost: number;
        estimatedCost: number;
    }): Promise<{ updatedScore: number }> {
        const costAccuracy = 1 - Math.abs(1 - data.estimatedCost / data.actualCost);

        console.log(
            `[Ontology] Worker ${data.workerId} calibration: ${data.skillCategory} → ` +
            `${data.wasSuccessful ? '✅ Success' : '❌ Rework'} | ` +
            `${data.completionMinutes}min | ⭐${data.customerRating} | Cost accuracy: ${(costAccuracy * 100).toFixed(1)}%`
        );

        return { updatedScore: costAccuracy };
    }

    /**
     * Get ontology health metrics for the Enterprise Dashboard.
     * Shows VC investors how the private knowledge base is growing.
     */
    getOntologyMetrics(): {
        totalEntries: number;
        avgConfidence: number;
        priceObservations: number;
        failurePatterns: number;
        workerProfiles: number;
        moatScore: number; // 0-100
        dataAge: string;   // "Since March 2026"
    } {
        // Mock metrics — in production, aggregate from DB
        return {
            totalEntries: 347,
            avgConfidence: 0.72,
            priceObservations: 189,
            failurePatterns: 83,
            workerProfiles: 24,
            moatScore: 65,        // Grows with data accumulation
            dataAge: 'Since March 2026',
        };
    }
}

export const knowledgeService = new KnowledgeAccumulationService();
