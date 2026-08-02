import type { CaseEventDatabase, CaseEventInput, CaseEventResult, CaseProjection } from './contracts.js';
import { CaseEventRepository } from './repository.js';

export class CaseEventService {
    private readonly repository: CaseEventRepository;

    constructor(database: CaseEventDatabase) {
        this.repository = new CaseEventRepository(database);
    }

    append(input: CaseEventInput): Promise<CaseEventResult> {
        return this.repository.append(input);
    }

    replay(organizationId: number, caseId: number): Promise<CaseProjection> {
        return this.repository.replay(organizationId, caseId);
    }
}

