/**
 * Agent Integration Tests
 * 
 * Tests for validating agent definitions, handoff protocols, and swarm architecture.
 */

import { describe, it, expect } from 'vitest';
import {
    loadAgent,
    validateHandoffTargets,
    getAllAgentNames,
    AgentDefinition
} from './agent-utils';

describe('Agent Definitions', () => {
    describe('All Agents', () => {
        it('should load all agent definitions without errors', () => {
            const agentNames = getAllAgentNames();
            expect(agentNames.length).toBeGreaterThan(0);

            for (const name of agentNames) {
                expect(() => loadAgent(name)).not.toThrow();
            }
        });

        it('should have valid frontmatter for all agents', () => {
            const agentNames = getAllAgentNames();

            for (const name of agentNames) {
                const agent = loadAgent(name);
                expect(agent.name).toBeTruthy();
                expect(agent.description).toBeTruthy();
            }
        });

        it('should have no broken handoff references', () => {
            const agentNames = getAllAgentNames();
            const allErrors: string[] = [];

            for (const name of agentNames) {
                const agent = loadAgent(name);
                const errors = validateHandoffTargets(agent);
                allErrors.push(...errors);
            }

            expect(allErrors).toEqual([]);
        });
    });

    describe('Planner Agent', () => {
        let planner: AgentDefinition;

        it('should load planner agent', () => {
            planner = loadAgent('planner');
            expect(planner).toBeDefined();
            expect(planner.name).toBe('Planner Agent');
        });

        it('should have task-router handoff', () => {
            planner = loadAgent('planner');
            const hasTaskRouter = planner.handoffs.some(h => h.to === 'task-router');
            expect(hasTaskRouter).toBe(true);
        });

        it('should have swarm-orchestrator handoff', () => {
            planner = loadAgent('planner');
            const hasSwarm = planner.handoffs.some(h => h.to === 'swarm-orchestrator');
            expect(hasSwarm).toBe(true);
        });

        it('should have constraint-auditor handoff', () => {
            planner = loadAgent('planner');
            const hasAuditor = planner.handoffs.some(h => h.to === 'constraint-auditor');
            expect(hasAuditor).toBe(true);
        });
    });

    describe('Task Router Agent', () => {
        it('should define complexity scoring criteria', () => {
            const router = loadAgent('task-router');
            expect(router.content).toContain('complexity');
            expect(router.content).toContain('simple');
            expect(router.content).toContain('complex');
        });
    });

    describe('Swarm Orchestrator Agent', () => {
        it('should define swarm members', () => {
            const swarm = loadAgent('swarm-orchestrator');
            expect(swarm.content).toContain('researcher');
            expect(swarm.content).toContain('coder');
            expect(swarm.content).toContain('red-team');
        });

        it('should define conflict resolution', () => {
            const swarm = loadAgent('swarm-orchestrator');
            expect(swarm.content.toLowerCase()).toContain('conflict');
        });
    });

    describe('HITL Auditor Agent', () => {
        it('should define approval workflow', () => {
            const hitl = loadAgent('hitl-auditor');
            expect(hitl.content).toContain('Approve');
            expect(hitl.content).toContain('changes');
            expect(hitl.content.toLowerCase()).toContain('reject');
        });
    });

    describe('Auto Standardizer Agent', () => {
        it('should define SOP creation', () => {
            const standardizer = loadAgent('auto-standardizer');
            expect(standardizer.content).toContain('SOP');
        });

        it('should define monitoring setup', () => {
            const standardizer = loadAgent('auto-standardizer');
            expect(standardizer.content).toContain('monitor');
        });
    });
});

describe('Swarm Architecture Flow', () => {
    it('should have complete handoff chain from planner to standardizer', () => {
        const planner = loadAgent('planner');
        const expectedChain = [
            'task-router',
            'constraint-auditor',
            'manager-agent',
            'tree-of-thoughts',
            'swarm-orchestrator',
            'sandbox-runner',
            'hitl-auditor',
            'auto-standardizer'
        ];

        // Planner should reference all key agents
        for (const agent of expectedChain) {
            const referenced = planner.content.includes(agent);
            expect(referenced).toBe(true);
        }
    });
});
