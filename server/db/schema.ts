import {
    check,
    foreignKey,
    index,
    integer,
    real,
    sqliteTable,
    text,
    unique,
    uniqueIndex,
    type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users Table
export const users = sqliteTable('users', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    phone: text('phone').unique(), // Nullable since WeChat login might not have phone initally
    wechatOpenId: text('wechat_openid').unique(),
    wechatUnionId: text('wechat_unionid').unique(),
    wechatSessionKey: text('wechat_session_key'),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    avatar: text('avatar'),
    role: text('role', { enum: ['user', 'worker', 'admin', 'manager', 'tenant'] }).default('user'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Workers Table
export const workers = sqliteTable('workers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    skills: text('skills').notNull(), // JSON array
    rating: real('rating').default(5.0),
    totalJobs: integer('total_jobs').default(0),
    latitude: real('latitude'),
    longitude: real('longitude'),
    available: integer('available').default(1),
    bio: text('bio'),
    hourlyRate: real('hourly_rate'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Reports Table
export const reports = sqliteTable('reports', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category'),
    voiceUrl: text('voice_url'),
    videoUrl: text('video_url'),
    imageUrls: text('image_urls'), // JSON array
    diagnosisResult: text('diagnosis_result'),
    issueType: text('issue_type'),
    severity: text('severity'),
    diagnosisSummary: text('diagnosis_summary'),
    confidenceScore: real('confidence_score'),
    priorityProtocol: text('priority_protocol'),
    estimatedArrival: text('estimated_arrival'),
    resolutionPlan: text('resolution_plan'),
    status: text('status', {
        enum: [
            'pending',
            'analyzed',
            'planned',
            'matching',
            'broadcasted',
            'matched',
            'in_progress',
            'completed',
            'cancelled',
            'failed_analysis',
            'failed_planning',
            'flagged_for_review'
        ]
    }).default('pending'),
    matchedWorkerId: integer('matched_worker_id').references(() => workers.id, { onDelete: 'set null' }),
    patternId: integer('pattern_id'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    urgencyScore: integer('urgency_score').default(0),
    matchScore: real('match_score'),
    matchedAt: text('matched_at'),
    completedAt: text('completed_at'),
    resolutionDetails: text('resolution_details'), // JSON: { steps, parts, cost, photos }
    severityTag: text('severity_tag', { enum: ['diy', '48h', 'emergency'] }).default('48h'),
    diagnosisCorrect: integer('diagnosis_correct', { mode: 'boolean' }),
    firstTimeFix: integer('first_time_fix', { mode: 'boolean' }),
    patternExtracted: integer('pattern_extracted', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Matches Table
export const matches = sqliteTable('matches', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    workerId: integer('worker_id').notNull().references(() => workers.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    distanceScore: real('distance_score'),
    ratingScore: real('rating_score'),
    skillScore: real('skill_score'),
    status: text('status', { enum: ['pending', 'accepted', 'rejected'] }).default('pending'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Reviews Table
export const reviews = sqliteTable('reviews', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    workerId: integer('worker_id').notNull().references(() => workers.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    photos: text('photos'), // JSON array of photo URLs
    createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
    uniqueIndex('reviews_report_id_unique').on(table.reportId)
]);

// Posts Table
export const posts = sqliteTable('posts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),
    tags: text('tags'), // JSON array
    likes: integer('likes').default(0),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Patterns Table (AI Learning)
export const patterns = sqliteTable('patterns', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    problemType: text('problem_type').notNull(),
    contextSignature: text('context_signature').notNull(),
    solution: text('solution').notNull(), // JSON
    successRate: real('success_rate').default(1.0),
    usageCount: integer('usage_count').default(1),
    performanceScore: real('performance_score').default(0),
    consecutiveHighRatings: integer('consecutive_high_ratings').default(0),
    status: text('status').default('experimental'),
    isVariant: integer('is_variant', { mode: 'boolean' }).default(false),
    generationVersion: integer('generation_version').default(1),
    lastUsed: text('last_used').default(sql`(datetime('now'))`),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Refresh Tokens Table
export const refreshTokens = sqliteTable('refresh_tokens', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    revoked: integer('revoked', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// User Assets Table (Phase 1.1)
export const userAssets = sqliteTable('user_assets', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // 'appliance', 'system', 'structure'
    name: text('name').notNull(), // 'Samsung Refrigerator'
    brand: text('brand'),
    model: text('model'),
    serialNumber: text('serial_number'),
    purchaseDate: text('purchase_date'),
    warrantyExpiry: text('warranty_expiry'),
    specs: text('specs'), // JSON string for technical details
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Price Guide Table (Phase 1.2)
export const priceGuide = sqliteTable('price_guide', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    category: text('category').notNull(), // 'plumbing'
    taskName: text('task_name').notNull(), // 'Faucet Replacement'
    description: text('description'),
    basePriceLow: real('base_price_low').notNull(),
    basePriceHigh: real('base_price_high').notNull(),
    unit: text('unit').notNull(), // 'per_item', 'per_hour', 'fixed'
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// AI Usage Logs Table (Phase 13)
export const aiUsageLogs = sqliteTable('ai_usage_logs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    modelName: text('model_name').notNull(),
    inputTokens: integer('input_tokens').default(0),
    outputTokens: integer('output_tokens').default(0),
    totalTokens: integer('total_tokens').default(0),
    costUsd: real('cost_usd').default(0.0),
    endpoint: text('endpoint'),
    durationMs: integer('duration_ms'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// AI Settings Table (Phase 13)
export const aiSettings = sqliteTable('ai_settings', {
    key: text('key').primaryKey(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

export const researchBudgetReservations = sqliteTable('research_budget_reservations', {
    periodKey: text('period_key').primaryKey(),
    budgetCny: real('budget_cny').notNull(),
    reservedCny: real('reserved_cny').notNull().default(0),
    spentCny: real('spent_cny').notNull().default(0),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// AI Feedback Table (Product Improvement: Trust Loop)
export const aiFeedback = sqliteTable('ai_feedback', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
    diagnosisData: text('diagnosis_data'), // JSON string of the diagnosis result
    isHelpful: integer('is_helpful', { mode: 'boolean' }),
    rating: integer('rating'),
    type: text('type', { enum: ['thumbs_up', 'thumbs_down', 'correction'] }),
    comment: text('comment'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Orders Table (Product Improvement: Payment Lifecycle)
export const orders = sqliteTable('orders', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
    workerId: integer('worker_id').references(() => workers.id, { onDelete: 'set null' }),
    stripeSessionId: text('stripe_session_id').unique(),
    wechatOutTradeNo: text('wechat_out_trade_no').unique(), // For WeChat Pay
    amount: real('amount').notNull(),
    currency: text('currency').default('cny'), // Changed from usd to cny
    status: text('status', { enum: ['pending', 'paid', 'refunded', 'failed', 'cancelled'] }).default('pending'),
    receiptUrl: text('receipt_url'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Messages Table (P1: User-Worker Messaging)
export const messages = sqliteTable('messages', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    senderId: integer('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    receiverId: integer('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'set null' }),
    content: text('content').notNull(),
    readAt: text('read_at'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Notifications Table (P1: In-App Notifications)
export const notifications = sqliteTable('notifications', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['job_update', 'message', 'payment', 'system'] }).notNull(),
    title: text('title').notNull(),
    body: text('body'),
    data: text('data'), // JSON
    readAt: text('read_at'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Cases Table (Phase 5: Persistent Diagnostic Cases)
export const cases = sqliteTable('cases', {
    id: text('id').primaryKey(), // Using text for UUID/NanoID from frontend
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    titleEn: text('title_en').notNull(),
    status: text('status', { enum: ['active', 'archived'] }).default('active'),
    step: integer('step').default(1),
    severity: text('severity', { enum: ['low', 'moderate', 'critical'] }).default('moderate'),
    date: text('date').notNull(), // ISO date
    category: text('category'),
    rootCause: text('root_cause'),
    solution: text('solution'),
    fullData: text('full_data'), // JSON blob for entire WizardState if needed
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// Agent Sessions Table (Phase 6: Omnichannel Agent Context)
export const agentSessions = sqliteTable('agent_sessions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    channel: text('channel', { enum: ['telegram', 'whatsapp', 'web', 'sms'] }).notNull(),
    externalId: text('external_id').notNull(), // e.g. Telegram chat_id
    context: text('context'), // JSON blob of memory/state
    lastActive: text('last_active').default(sql`(datetime('now'))`),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Device Nodes Table (Phase 6: Edge Vision Nodes)
export const deviceNodes = sqliteTable('device_nodes', {
    id: text('id').primaryKey(), // Hardware ID or NanoID
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type').notNull(), // 'camera', 'sensor', 'gateway'
    status: text('status', { enum: ['online', 'offline', 'error'] }).default('offline'),
    metadata: text('metadata'), // JSON blob (IP, firmware, etc)
    lastSeen: text('last_seen').default(sql`(datetime('now'))`),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Fault Attributions Table (Blue Ocean S2: 责任判定)
export const faultAttributions = sqliteTable('fault_attributions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    reportId: integer('report_id').references(() => reports.id, { onDelete: 'cascade' }),
    attribution: text('attribution', { enum: ['landlord', 'tenant', 'shared', 'undetermined'] }).notNull(),
    confidenceScore: real('confidence_score').notNull(),
    evidence: text('evidence').notNull(),       // JSON array of evidence points
    reasoning: text('reasoning').notNull(),
    legalReference: text('legal_reference'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Turnover Inspections Table (Blue Ocean S3: 度假房交接)
export const turnoverInspections = sqliteTable('turnover_inspections', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    propertyId: text('property_id'),            // External property ID (Tujia/Airbnb)
    propertyName: text('property_name'),
    inspectionType: text('inspection_type', { enum: ['checkin', 'checkout', 'comparison'] }).notNull(),
    overallCondition: text('overall_condition', { enum: ['excellent', 'good', 'fair', 'damaged'] }),
    damageReport: text('damage_report'),         // JSON: TurnoverReport
    beforeImageUrls: text('before_image_urls'),  // JSON array
    afterImageUrls: text('after_image_urls'),    // JSON array
    cleanlinessScore: integer('cleanliness_score'),
    estimatedDamageCost: real('estimated_damage_cost'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// Blackboard tables used by the diagnosis, planning, and vendor workers.
export const tasks = sqliteTable('tasks', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    objective: text('objective').notNull(),
    status: text('status', {
        enum: ['new', 'claimed', 'running', 'blocked', 'review', 'done', 'failed'],
    }).default('new'),
    priority: text('priority', {
        enum: ['low', 'medium', 'high', 'critical'],
    }).default('medium'),
    ownerClaw: text('owner_claw'),
    inputs: text('inputs'),
    outputs: text('outputs'),
    score: real('score').default(0),
    failureReason: text('failure_reason'),
    retryCount: integer('retry_count').default(0),
    maxRetries: integer('max_retries').default(3),
    parentTaskId: integer('parent_task_id').references((): AnySQLiteColumn => tasks.id, { onDelete: 'cascade' }),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
}, (table) => [
    index('idx_tasks_status').on(table.status),
    index('idx_tasks_owner').on(table.ownerClaw),
]);

export const pheromoneEvents = sqliteTable('pheromone_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    actor: text('actor').notNull(),
    eventType: text('event_type').notNull(),
    payload: text('payload'),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
}, (table) => [
    index('idx_pheromone_task_id').on(table.taskId),
]);

// Organization-scoped maintenance case foundation (B1).
export const organizations = sqliteTable('organizations', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    status: text('status', { enum: ['active', 'suspended', 'closed'] }).notNull().default('active'),
    defaultTimezone: text('default_timezone').notNull().default('UTC'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
    unique('organizations_slug_unique').on(table.slug),
    check('organizations_id_positive', sql`${table.id} > 0`),
    check('organizations_status_check', sql`${table.status} in ('active', 'suspended', 'closed')`),
]);

export const organizationMemberships = sqliteTable('organization_memberships', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizationId: integer('organization_id').notNull()
        .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    role: text('role', { enum: ['owner', 'admin', 'manager', 'resident', 'worker', 'auditor'] }).notNull(),
    status: text('status', { enum: ['active', 'invited', 'suspended', 'revoked'] }).notNull().default('active'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
    revokedAt: text('revoked_at'),
}, (table) => [
    unique('organization_memberships_org_user_unique').on(table.organizationId, table.userId),
    unique('organization_memberships_org_id_unique').on(table.organizationId, table.id),
    index('idx_organization_memberships_user_status').on(table.userId, table.status),
    index('idx_organization_memberships_org_role_status').on(table.organizationId, table.role, table.status),
    check('organization_memberships_ids_positive', sql`${table.id} > 0 and ${table.organizationId} > 0 and ${table.userId} > 0`),
    check('organization_memberships_role_check', sql`${table.role} in ('owner', 'admin', 'manager', 'resident', 'worker', 'auditor')`),
    check('organization_memberships_status_check', sql`${table.status} in ('active', 'invited', 'suspended', 'revoked')`),
]);

export const properties = sqliteTable('properties', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizationId: integer('organization_id').notNull()
        .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    externalRef: text('external_ref'),
    timezone: text('timezone').notNull().default('UTC'),
    status: text('status', { enum: ['active', 'inactive', 'archived'] }).notNull().default('active'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
    unique('properties_org_id_unique').on(table.organizationId, table.id),
    unique('properties_org_external_ref_unique').on(table.organizationId, table.externalRef),
    index('idx_properties_org_status').on(table.organizationId, table.status),
    check('properties_ids_positive', sql`${table.id} > 0 and ${table.organizationId} > 0`),
    check('properties_status_check', sql`${table.status} in ('active', 'inactive', 'archived')`),
]);

export const units = sqliteTable('units', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizationId: integer('organization_id').notNull()
        .references(() => organizations.id, { onDelete: 'restrict' }),
    propertyId: integer('property_id').notNull(),
    label: text('label').notNull(),
    externalRef: text('external_ref'),
    status: text('status', { enum: ['active', 'inactive', 'archived'] }).notNull().default('active'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
    foreignKey({
        name: 'units_org_property_fk',
        columns: [table.organizationId, table.propertyId],
        foreignColumns: [properties.organizationId, properties.id],
    }).onDelete('restrict'),
    unique('units_org_id_unique').on(table.organizationId, table.id),
    unique('units_org_property_id_unique').on(table.organizationId, table.propertyId, table.id),
    unique('units_property_label_unique').on(table.propertyId, table.label),
    unique('units_org_property_external_ref_unique')
        .on(table.organizationId, table.propertyId, table.externalRef),
    index('idx_units_org_property_status').on(table.organizationId, table.propertyId, table.status),
    check('units_ids_positive', sql`${table.id} > 0 and ${table.organizationId} > 0 and ${table.propertyId} > 0`),
    check('units_status_check', sql`${table.status} in ('active', 'inactive', 'archived')`),
]);

export const resourceGrants = sqliteTable('resource_grants', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizationId: integer('organization_id').notNull()
        .references(() => organizations.id, { onDelete: 'restrict' }),
    membershipId: integer('membership_id').notNull(),
    resourceType: text('resource_type', { enum: ['organization', 'property', 'unit', 'case'] }).notNull(),
    resourceId: integer('resource_id').notNull(),
    capability: text('capability', {
        enum: ['read', 'contribute', 'manage', 'message', 'media', 'dispatch', 'verify', 'report'],
    }).notNull(),
    grantedByMembershipId: integer('granted_by_membership_id'),
    expiresAt: text('expires_at'),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
    foreignKey({
        name: 'resource_grants_org_membership_fk',
        columns: [table.organizationId, table.membershipId],
        foreignColumns: [organizationMemberships.organizationId, organizationMemberships.id],
    }).onDelete('restrict'),
    foreignKey({
        name: 'resource_grants_org_grantor_fk',
        columns: [table.organizationId, table.grantedByMembershipId],
        foreignColumns: [organizationMemberships.organizationId, organizationMemberships.id],
    }).onDelete('restrict'),
    unique('resource_grants_scope_unique').on(table.membershipId, table.resourceType, table.resourceId, table.capability),
    index('idx_resource_grants_target').on(table.organizationId, table.resourceType, table.resourceId),
    check('resource_grants_ids_positive', sql`${table.id} > 0 and ${table.organizationId} > 0 and ${table.membershipId} > 0 and ${table.resourceId} > 0 and (${table.grantedByMembershipId} is null or ${table.grantedByMembershipId} > 0)`),
    check('resource_grants_type_check', sql`${table.resourceType} in ('organization', 'property', 'unit', 'case')`),
    check('resource_grants_capability_check', sql`${table.capability} in ('read', 'contribute', 'manage', 'message', 'media', 'dispatch', 'verify', 'report')`),
    check('resource_grants_organization_scope_check', sql`${table.resourceType} <> 'organization' or ${table.resourceId} = ${table.organizationId}`),
]);

export const maintenanceCases = sqliteTable('maintenance_cases', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizationId: integer('organization_id').notNull()
        .references(() => organizations.id, { onDelete: 'restrict' }),
    propertyId: integer('property_id'),
    unitId: integer('unit_id'),
    openedByMembershipId: integer('opened_by_membership_id'),
    legacyReportId: integer('legacy_report_id')
        .references(() => reports.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    status: text('status', { enum: ['open', 'resolved', 'closed', 'cancelled'] }).notNull().default('open'),
    stage: text('stage', {
        enum: ['intake', 'diagnosis', 'resolution', 'dispatch', 'repair', 'verification', 'closed'],
    }).notNull().default('intake'),
    priority: text('priority', { enum: ['low', 'normal', 'urgent', 'emergency'] }).notNull().default('normal'),
    version: integer('version').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
    closedAt: text('closed_at'),
}, (table) => [
    foreignKey({
        name: 'maintenance_cases_org_property_fk',
        columns: [table.organizationId, table.propertyId],
        foreignColumns: [properties.organizationId, properties.id],
    }).onDelete('restrict'),
    foreignKey({
        name: 'maintenance_cases_org_property_unit_fk',
        columns: [table.organizationId, table.propertyId, table.unitId],
        foreignColumns: [units.organizationId, units.propertyId, units.id],
    }).onDelete('restrict'),
    foreignKey({
        name: 'maintenance_cases_org_opener_fk',
        columns: [table.organizationId, table.openedByMembershipId],
        foreignColumns: [organizationMemberships.organizationId, organizationMemberships.id],
    }).onDelete('restrict'),
    unique('maintenance_cases_org_id_unique').on(table.organizationId, table.id),
    unique('maintenance_cases_legacy_report_unique').on(table.legacyReportId),
    index('idx_maintenance_cases_org_status_updated').on(table.organizationId, table.status, table.updatedAt),
    index('idx_maintenance_cases_org_property_unit').on(table.organizationId, table.propertyId, table.unitId),
    index('idx_maintenance_cases_legacy_report').on(table.legacyReportId),
    check('maintenance_cases_ids_positive', sql`${table.id} > 0 and ${table.organizationId} > 0 and (${table.propertyId} is null or ${table.propertyId} > 0) and (${table.unitId} is null or ${table.unitId} > 0) and (${table.openedByMembershipId} is null or ${table.openedByMembershipId} > 0) and (${table.legacyReportId} is null or ${table.legacyReportId} > 0)`),
    check('maintenance_cases_status_check', sql`${table.status} in ('open', 'resolved', 'closed', 'cancelled')`),
    check('maintenance_cases_stage_check', sql`${table.stage} in ('intake', 'diagnosis', 'resolution', 'dispatch', 'repair', 'verification', 'closed')`),
    check('maintenance_cases_priority_check', sql`${table.priority} in ('low', 'normal', 'urgent', 'emergency')`),
    check('maintenance_cases_version_check', sql`${table.version} >= 0`),
    check('maintenance_cases_unit_property_check', sql`${table.unitId} is null or ${table.propertyId} is not null`),
]);

export const caseEvents = sqliteTable('case_events', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    organizationId: integer('organization_id').notNull()
        .references(() => organizations.id, { onDelete: 'restrict' }),
    caseId: integer('case_id').notNull(),
    sequence: integer('sequence').notNull(),
    eventType: text('event_type', {
        enum: ['case_opened', 'legacy_imported', 'case_updated', 'case_stage_changed', 'case_resolved', 'case_closed', 'case_cancelled', 'case_reopened'],
    }).notNull(),
    schemaVersion: integer('schema_version').notNull().default(1),
    reducerVersion: integer('reducer_version').notNull().default(1),
    actorType: text('actor_type', { enum: ['member', 'system', 'agent', 'integration'] }).notNull(),
    actorMembershipId: integer('actor_membership_id'),
    idempotencyKey: text('idempotency_key').notNull(),
    commandHash: text('command_hash').notNull(),
    payloadHash: text('payload_hash').notNull(),
    projectionPatchJson: text('projection_patch_json').notNull(),
    payloadJson: text('payload_json').notNull(),
    correlationId: text('correlation_id'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => [
    foreignKey({
        name: 'case_events_org_case_fk',
        columns: [table.organizationId, table.caseId],
        foreignColumns: [maintenanceCases.organizationId, maintenanceCases.id],
    }).onDelete('restrict'),
    foreignKey({
        name: 'case_events_org_actor_fk',
        columns: [table.organizationId, table.actorMembershipId],
        foreignColumns: [organizationMemberships.organizationId, organizationMemberships.id],
    }).onDelete('restrict'),
    unique('case_events_case_sequence_unique').on(table.caseId, table.sequence),
    unique('case_events_case_idempotency_unique').on(table.caseId, table.idempotencyKey),
    index('idx_case_events_org_case_sequence').on(table.organizationId, table.caseId, table.sequence),
    index('idx_case_events_correlation').on(table.correlationId),
    check('case_events_ids_positive', sql`${table.id} > 0 and ${table.organizationId} > 0 and ${table.caseId} > 0 and (${table.actorMembershipId} is null or ${table.actorMembershipId} > 0)`),
    check('case_events_versions_check', sql`${table.sequence} > 0 and ${table.schemaVersion} > 0 and ${table.reducerVersion} = 1`),
    check('case_events_type_check', sql`${table.eventType} in ('case_opened', 'legacy_imported', 'case_updated', 'case_stage_changed', 'case_resolved', 'case_closed', 'case_cancelled', 'case_reopened')`),
    check('case_events_actor_check', sql`${table.actorType} in ('member', 'system', 'agent', 'integration')`),
    check('case_events_member_actor_check', sql`${table.actorType} <> 'member' or ${table.actorMembershipId} is not null`),
]);

