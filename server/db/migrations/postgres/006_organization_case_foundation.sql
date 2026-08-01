-- Additive B1 foundation. Runtime PostgreSQL execution remains a blocked dependency.
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY CHECK(id > 0), slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','suspended','closed')),
    default_timezone TEXT NOT NULL DEFAULT 'UTC', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS organization_memberships (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, user_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner','admin','manager','resident','worker','auditor')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','invited','suspended','revoked')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP, CHECK(id > 0 AND organization_id > 0 AND user_id > 0),
    UNIQUE(organization_id,user_id), UNIQUE(organization_id,id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, name TEXT NOT NULL, external_ref TEXT,
    timezone TEXT NOT NULL DEFAULT 'UTC', status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0), UNIQUE(organization_id,id), UNIQUE(organization_id,external_ref),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, property_id INTEGER NOT NULL, label TEXT NOT NULL,
    external_ref TEXT, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive','archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND property_id > 0), UNIQUE(organization_id,id),
    UNIQUE(organization_id,property_id,id), UNIQUE(property_id,label), UNIQUE(organization_id,property_id,external_ref),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id) REFERENCES properties(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS resource_grants (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, membership_id INTEGER NOT NULL,
    resource_type TEXT NOT NULL CHECK(resource_type IN ('organization','property','unit','case')), resource_id INTEGER NOT NULL,
    capability TEXT NOT NULL CHECK(capability IN ('read','contribute','manage','message','media','dispatch','verify','report')),
    granted_by_membership_id INTEGER, expires_at TIMESTAMP, revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND membership_id > 0 AND resource_id > 0 AND (granted_by_membership_id IS NULL OR granted_by_membership_id > 0)),
    CHECK(resource_type <> 'organization' OR resource_id = organization_id),
    UNIQUE(membership_id,resource_type,resource_id,capability),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,granted_by_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT
);
CREATE TABLE IF NOT EXISTS maintenance_cases (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, property_id INTEGER, unit_id INTEGER,
    opened_by_membership_id INTEGER, legacy_report_id INTEGER UNIQUE, title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','closed','cancelled')),
    stage TEXT NOT NULL DEFAULT 'intake' CHECK(stage IN ('intake','diagnosis','resolution','dispatch','repair','verification','closed')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','urgent','emergency')),
    version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0), created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, closed_at TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND (property_id IS NULL OR property_id > 0) AND (unit_id IS NULL OR unit_id > 0) AND (opened_by_membership_id IS NULL OR opened_by_membership_id > 0) AND (legacy_report_id IS NULL OR legacy_report_id > 0)),
    CHECK(unit_id IS NULL OR property_id IS NOT NULL), UNIQUE(organization_id,id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id) REFERENCES properties(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,property_id,unit_id) REFERENCES units(organization_id,property_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,opened_by_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (legacy_report_id) REFERENCES reports(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS case_events (
    id SERIAL PRIMARY KEY, organization_id INTEGER NOT NULL, case_id INTEGER NOT NULL, sequence INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('case_opened','legacy_imported','case_updated','case_stage_changed','case_resolved','case_closed','case_cancelled','case_reopened')),
    schema_version INTEGER NOT NULL DEFAULT 1, reducer_version INTEGER NOT NULL DEFAULT 1,
    actor_type TEXT NOT NULL CHECK(actor_type IN ('member','system','agent','integration')), actor_membership_id INTEGER,
    idempotency_key TEXT NOT NULL, command_hash TEXT NOT NULL, payload_hash TEXT NOT NULL,
    projection_patch_json TEXT NOT NULL, payload_json TEXT NOT NULL, correlation_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(id > 0 AND organization_id > 0 AND case_id > 0 AND (actor_membership_id IS NULL OR actor_membership_id > 0)),
    CHECK(sequence > 0 AND schema_version > 0 AND reducer_version = 1),
    CHECK(actor_type <> 'member' OR actor_membership_id IS NOT NULL),
    UNIQUE(case_id,sequence), UNIQUE(case_id,idempotency_key),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,case_id) REFERENCES maintenance_cases(organization_id,id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id,actor_membership_id) REFERENCES organization_memberships(organization_id,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_status ON organization_memberships(user_id,status);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_org_role_status ON organization_memberships(organization_id,role,status);
CREATE INDEX IF NOT EXISTS idx_properties_org_status ON properties(organization_id,status);
CREATE INDEX IF NOT EXISTS idx_units_org_property_status ON units(organization_id,property_id,status);
CREATE INDEX IF NOT EXISTS idx_resource_grants_target ON resource_grants(organization_id,resource_type,resource_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_cases_org_status_updated ON maintenance_cases(organization_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_cases_org_property_unit ON maintenance_cases(organization_id,property_id,unit_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_cases_legacy_report ON maintenance_cases(legacy_report_id);
CREATE INDEX IF NOT EXISTS idx_case_events_org_case_sequence ON case_events(organization_id,case_id,sequence);
CREATE INDEX IF NOT EXISTS idx_case_events_correlation ON case_events(correlation_id);
CREATE OR REPLACE FUNCTION reject_case_event_mutation() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'case_events is append-only'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS case_events_reject_update ON case_events;
CREATE TRIGGER case_events_reject_update BEFORE UPDATE ON case_events
FOR EACH ROW EXECUTE FUNCTION reject_case_event_mutation();
DROP TRIGGER IF EXISTS case_events_reject_delete ON case_events;
CREATE TRIGGER case_events_reject_delete BEFORE DELETE ON case_events
FOR EACH ROW EXECUTE FUNCTION reject_case_event_mutation();
