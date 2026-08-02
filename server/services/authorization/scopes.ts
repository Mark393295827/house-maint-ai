import {
    isAction,
    isGrantResourceType,
    isPositiveId,
    isResourceType,
    type Principal,
    type QueryScope,
    type ResolvedGrant,
    type ResolvedResource,
} from './contracts.js';
export type DirectRelation = 'owner' | 'participant' | null;
const INSTANT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/;
export function parseInstant(value: string): number | null {
    if (typeof value !== 'string') return null;
    const match = INSTANT.exec(value);
    if (!match) return null;
    const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (month < 1 || month > 12 || day < 1 || day > maxDay
        || hour > 23 || minute > 59 || second > 59
        || year < 1 || (match[7] !== 'Z' && (Number(match[8]) > 23 || Number(match[9]) > 59))) {
        return null;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
}
export const isGrantLive = (grant: ResolvedGrant, evaluatedAt: string): boolean => {
    if (!isResolvedGrant(grant)) return false;
    const evaluated = parseInstant(evaluatedAt);
    if (evaluated === null || grant.revokedAt !== undefined) return false;
    if (grant.expiresAt === undefined) return true;
    const expires = parseInstant(grant.expiresAt);
    return expires !== null && expires > evaluated;
};
export function isResolvedResource(resource: ResolvedResource): boolean {
    if (!resource || typeof resource !== 'object' || !isResourceType(resource.type)
        || !isPositiveId(resource.id) || !isPositiveId(resource.organizationId)
        || resource.ownerUserId !== undefined && !isPositiveId(resource.ownerUserId)
        || resource.assignedWorkerUserId !== undefined && !isPositiveId(resource.assignedWorkerUserId)
        || resource.participantUserIds !== undefined
            && (!Array.isArray(resource.participantUserIds)
                || resource.participantUserIds.some((id) => !isPositiveId(id)))) return false;
    const property = resource.propertyId;
    const unit = resource.unitId;
    const caseId = resource.caseId;
    if (resource.type === 'organization') {
        return resource.id === resource.organizationId
            && property === undefined && unit === undefined && caseId === undefined;
    }
    if (resource.type === 'property') {
        return property === undefined && unit === undefined && caseId === undefined;
    }
    if (resource.type === 'unit') {
        return isPositiveId(property) && unit === undefined && caseId === undefined;
    }
    if (resource.type === 'case') {
        return resource.caseId === resource.id
            && (property === undefined || isPositiveId(property))
            && (unit === undefined || isPositiveId(unit) && isPositiveId(property))
            && (caseId === undefined || caseId === resource.id);
    }
    return isPositiveId(caseId)
        && (property === undefined || isPositiveId(property))
        && (unit === undefined || isPositiveId(unit) && isPositiveId(property));
}
export const isResolvedGrant = (grant: ResolvedGrant): boolean =>
    Boolean(grant) && typeof grant === 'object'
    && isPositiveId(grant.organizationId) && isPositiveId(grant.membershipId)
    && isPositiveId(grant.resourceId)
    && isGrantResourceType(grant.resourceType)
    && isAction(grant.capability)
    && (grant.expiresAt === undefined || parseInstant(grant.expiresAt) !== null)
    && (grant.revokedAt === undefined || typeof grant.revokedAt === 'string')
    && (grant.resourceType !== 'organization'
        || grant.resourceId === grant.organizationId);
export function grantApplies(grant: ResolvedGrant, resource: ResolvedResource): boolean {
    if (!isResolvedResource(resource) || !isResolvedGrant(grant)
        || grant.organizationId !== resource.organizationId) return false;
    if (grant.resourceType === 'organization') return grant.resourceId === resource.organizationId;
    if (grant.resourceType === 'property') {
        return resource.type === 'property' && grant.resourceId === resource.id
            || (resource.type === 'unit' || resource.type === 'case')
                && grant.resourceId === resource.propertyId;
    }
    if (grant.resourceType === 'unit') {
        return resource.type === 'unit' && grant.resourceId === resource.id
            || resource.type === 'case' && grant.resourceId === resource.unitId;
    }
    return resource.type === 'case' && grant.resourceId === resource.id;
}
const unique = (values: number[]): number[] => [...new Set(values)].sort((a, b) => a - b);
export function buildQueryScope(
    principal: Principal,
    resource: ResolvedResource,
    grants: ResolvedGrant[],
    relation: DirectRelation,
): QueryScope {
    if (grants.some((item) => item.resourceType === 'organization')) {
        return { organizationId: principal.organizationId, access: 'organization',
            propertyIds: [], unitIds: [], caseIds: [] };
    }
    if (grants.length > 0) {
        return {
            organizationId: principal.organizationId, access: 'resource-set',
            propertyIds: unique(grants.filter((g) => g.resourceType === 'property')
                .map((g) => g.resourceId)),
            unitIds: unique(grants.filter((g) => g.resourceType === 'unit').map((g) => g.resourceId)),
            caseIds: unique(grants.filter((g) => g.resourceType === 'case').map((g) => g.resourceId)),
        };
    }
    const caseIds = resource.type === 'case' ? [resource.id]
        : resource.type === 'report' && resource.caseId ? [resource.caseId] : [];
    return {
        organizationId: principal.organizationId, access: relation ? 'owner-or-assigned' : 'none',
        propertyIds: [], unitIds: [], caseIds,
        ownerUserId: relation === 'owner' ? principal.userId : undefined,
    };
}
