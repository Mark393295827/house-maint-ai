import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import {
    normalizeCorrelationId,
    type Action,
    type Principal,
    type ResourceType,
} from '../services/authorization/contracts.js';
import {
    loadAuthorizationContext,
    type AuthorizationRepository,
} from '../services/authorization/repository.js';
import {
    OrganizationResolutionError,
    resolvePrincipal,
} from '../services/authorization/principal.js';
import { authorize } from '../services/authorization/policy.js';
export interface ResourceAuthorizationOptions {
    repository: AuthorizationRepository;
    action: Action;
    resolveResource(req: Request, principal: Principal): Promise<{
        type: ResourceType;
        id: number;
    } | null>;
    legacySingleOrgEnabled?: boolean;
}
const denyBody = (status: number) => ({
    error: status === 401 ? 'Authentication required' : status === 403 ? 'Forbidden' : 'Not Found',
});
export function createResourceAuthorization(options: ResourceAuthorizationOptions): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userId = Number(req.user?.id);
        if (!Number.isInteger(userId) || userId <= 0) {
            res.status(401).json(denyBody(401));
            return;
        }
        try {
            const principal = await resolvePrincipal({
                userId,
                organizationHint: req.header('X-Organization-Id'),
                legacySingleOrgEnabled: options.legacySingleOrgEnabled
                    ?? process.env.AUTHZ_LEGACY_SINGLE_ORG === 'true',
                repository: options.repository,
            });
            const request = await options.resolveResource(req, principal);
            const evaluatedAt = new Date().toISOString();
            const context = request
                ? await loadAuthorizationContext(options.repository, principal, request, evaluatedAt)
                : null;
            const resource = context?.resource;
            const decision = authorize({
                principal,
                context: context ?? undefined,
                resource,
                action: options.action,
                evaluatedAt,
                correlationId: normalizeCorrelationId(
                    req.header('X-Correlation-Id'),
                    crypto.randomUUID(),
                ),
            });
            res.locals.authorization = { principal, resource, decision };
            if (!decision.allowed) {
                res.status(decision.status).json(denyBody(decision.status));
                return;
            }
            next();
        } catch (error) {
            if (error instanceof OrganizationResolutionError) {
                res.status(error.status).json(denyBody(error.status));
                return;
            }
            next(error);
        }
    };
}
