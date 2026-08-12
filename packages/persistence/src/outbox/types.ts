import type { DeliveryEnvelope, DeliveryReceipt } from './wire-types.js';

export type EffectKind = 'assignment' | 'message';
export type EffectAction = 'dispatch' | 'quote' | 'spend' | 'external_message' | 'closure';
export type OutboxState = 'ready' | 'claimed' | 'delivering' | 'retry_wait' | 'delivered' | 'cancelled' | 'failed' | 'expired';

export interface EffectIntent {
    effect_key: string;
    effect_kind: EffectKind;
    run_id: string | null;
    scope_id: string;
    policy_version: string;
    action: EffectAction;
    proposal_hash: string;
    envelope: DeliveryEnvelope;
    max_attempts: number;
}

export interface OutboxEntry extends EffectIntent {
    state: OutboxState;
    attempts: number;
    next_attempt_at: string;
    lease_owner: string | null;
    lease_token: string | null;
    lease_expires_at: string | null;
    terminal_reason: string | null;
    created_at: string;
    updated_at: string;
    duplicate?: boolean;
}

export interface OutboxClaim {
    delivery_id: string;
    worker_id: string;
    lease_token: string;
    attempt: number;
    lease_expires_at: string;
    reclaimed: boolean;
    entry: OutboxEntry;
}

export interface IngressReceipt {
    source: 'job' | 'webhook';
    idempotency_key: string;
    payload_hash: string;
    result_ref: string;
    recorded_at: string;
    duplicate: boolean;
}

export interface OutboxStore {
    recordIngress(receipt: Omit<IngressReceipt, 'duplicate'>): Promise<IngressReceipt>;
    enqueue(intent: EffectIntent): Promise<OutboxEntry>;
    claim(workerId: string, leaseMs: number): Promise<OutboxClaim | null>;
    beginDelivery(claim: OutboxClaim): Promise<OutboxEntry>;
    recordDelivery(claim: OutboxClaim, receipt: DeliveryReceipt, retryAt?: string): Promise<OutboxEntry>;
    cancel(claim: OutboxClaim, reasonCode: string): Promise<OutboxEntry>;
    get(deliveryId: string): Promise<OutboxEntry | null>;
    receipts(deliveryId: string): Promise<DeliveryReceipt[]>;
}

export interface OutboxClock { now(): Date }
export interface OutboxIds { next(prefix: 'lease'): string }

export class OutboxError extends Error {
    constructor(public readonly code: string, message: string) {
        super(message);
        this.name = 'OutboxError';
    }
}
