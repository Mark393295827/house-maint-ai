import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users, reports } from './schema.js';

/**
 * ============================================================
 * DIMENSION 1: DATA ONTOLOGY (数据本体) — Private Knowledge Store
 * ============================================================
 *
 * VC Thesis: The scarcity of your data ontology is your moat.
 * This schema stores proprietary field knowledge that cannot be
 * bought on the internet — only accumulated through execution.
 *
 * Examples:
 *   - Old building renovation physical data (pipes, wiring specs)
 *   - Sanya-specific material pricing and supplier reliability
 *   - Climate-correlated failure patterns (humidity → mold, salt → corrosion)
 *   - Worker skill profiles calibrated by actual repair outcomes
 */

// ─── Private Knowledge Entries ───
// Each entry is a piece of proprietary domain knowledge
// accumulated from real-world repair operations.
export const knowledgeEntries = sqliteTable('knowledge_entries', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category').notNull(), // 'material', 'failure_pattern', 'building_spec', 'supplier', 'climate_correlation', 'skill_profile'
    subcategory: text('subcategory'),      // e.g. 'plumbing', 'electrical', 'hvac'
    title: text('title').notNull(),
    content: text('content').notNull(),    // The actual knowledge (JSON or text)
    source: text('source').notNull(),      // 'field_observation', 'repair_outcome', 'worker_feedback', 'ai_inference'
    confidence: real('confidence').default(0.5),  // 0.0-1.0, increases with validation
    validationCount: integer('validation_count').default(0), // Times this knowledge was confirmed
    refutationCount: integer('refutation_count').default(0), // Times this knowledge was contradicted
    regionCode: text('region_code').default('CN-HI-SY'), // ISO-like region (Sanya = CN-HI-SY)
    buildingType: text('building_type'),   // '老旧小区', '高层公寓', '别墅', '民宿'
    tags: text('tags'),                    // JSON array of tags for search
    contributorId: integer('contributor_id').references(() => users.id, { onDelete: 'set null' }),
    linkedReportId: integer('linked_report_id').references(() => reports.id, { onDelete: 'set null' }),
    expiresAt: text('expires_at'),         // Some knowledge expires (e.g. pricing)
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ─── Material Price Observations ───
// Track real prices observed in the field vs. AI predictions.
// This is the "private pricing oracle" that competitors cannot replicate.
export const materialPriceObservations = sqliteTable('material_price_observations', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    materialName: text('material_name').notNull(),
    materialCategory: text('material_category').notNull(), // 'plumbing', 'electrical', 'paint', 'hardware'
    brand: text('brand'),
    specification: text('specification'),  // "DN25 PPR热水管", "2.5mm² BV铜芯线"
    observedPrice: real('observed_price').notNull(),
    unit: text('unit').notNull(),          // '米', '个', '桶', '卷'
    supplierName: text('supplier_name'),
    location: text('location').default('三亚'),
    observedAt: text('observed_at').notNull(), // Date of price observation
    aiPredictedPrice: real('ai_predicted_price'), // What MaterialAgent predicted
    priceAccuracy: real('price_accuracy'),  // |1 - predicted/actual|
    season: text('season'),                // 'dry', 'wet', 'typhoon'
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ─── Failure Pattern Correlations ───
// Climate × Building × Component → failure probability.
// This is the "predictive maintenance brain" ontology.
export const failurePatterns = sqliteTable('failure_patterns', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    component: text('component').notNull(), // 'water_heater', 'ac_unit', 'pipe_joint', 'window_seal'
    failureMode: text('failure_mode').notNull(), // 'corrosion', 'leak', 'electrical_fault', 'mold'
    buildingAge: integer('building_age'),   // Years since construction
    buildingType: text('building_type'),
    climateFactor: text('climate_factor'),  // 'high_humidity', 'salt_air', 'typhoon_damage'
    monthObserved: integer('month_observed'), // 1-12, for seasonal correlation
    occurrenceCount: integer('occurrence_count').default(1),
    avgRepairCost: real('avg_repair_cost'),
    avgRepairHours: real('avg_repair_hours'),
    preventable: integer('preventable', { mode: 'boolean' }).default(false),
    preventionMethod: text('prevention_method'),
    regionCode: text('region_code').default('CN-HI-SY'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// ─── Worker Skill Calibration ───
// Track actual outcomes vs. expected for each worker+skill combo.
// This becomes the private "worker reliability score" that no competitor has.
export const workerSkillCalibration = sqliteTable('worker_skill_calibration', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    workerId: integer('worker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skillCategory: text('skill_category').notNull(), // 'plumbing', 'electrical', 'hvac', 'general'
    totalJobs: integer('total_jobs').default(0),
    successfulJobs: integer('successful_jobs').default(0), // First-time fix
    avgCompletionMinutes: real('avg_completion_minutes'),
    avgCustomerRating: real('avg_customer_rating'),
    costAccuracy: real('cost_accuracy'),   // How close actual cost was to AI estimate
    specializations: text('specializations'), // JSON array, e.g. ["老旧管道", "海边别墅"]
    lastCalibrated: text('last_calibrated').default(sql`(datetime('now'))`),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});
