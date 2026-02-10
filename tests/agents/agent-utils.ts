/**
 * Agent Test Utilities
 * 
 * Utilities for testing agent definitions and handoff protocols.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const AGENTS_DIR = join(__dirname, '../../agents');

/**
 * Agent definition structure
 */
export interface AgentDefinition {
    name: string;
    description: string;
    content: string;
    handoffs: HandoffDefinition[];
}

export interface HandoffDefinition {
    to: string;
    task: string;
    returns?: string;
}

/**
 * Load and parse an agent markdown file
 */
export function loadAgent(agentName: string): AgentDefinition {
    const filePath = join(AGENTS_DIR, `${agentName}.md`);

    if (!existsSync(filePath)) {
        throw new Error(`Agent not found: ${agentName}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const frontmatter = parseFrontmatter(content);
    const handoffs = parseHandoffs(content);

    return {
        name: frontmatter.name || agentName,
        description: frontmatter.description || '',
        content,
        handoffs,
    };
}

/**
 * Parse YAML frontmatter from markdown
 */
function parseFrontmatter(content: string): Record<string, string> {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    const result: Record<string, string> = {};
    const lines = match[1].split('\n');

    for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
            const key = line.slice(0, colonIndex).trim();
            const value = line.slice(colonIndex + 1).trim();
            result[key] = value;
        }
    }

    return result;
}

/**
 * Parse handoff definitions from agent markdown
 */
function parseHandoffs(content: string): HandoffDefinition[] {
    const handoffs: HandoffDefinition[] = [];
    const handoffRegex = /handoff:\s*\n\s*to:\s*(\S+)\s*\n\s*task:\s*"([^"]+)"/g;

    let match;
    while ((match = handoffRegex.exec(content)) !== null) {
        handoffs.push({
            to: match[1],
            task: match[2],
        });
    }

    return handoffs;
}

/**
 * Validate that an agent has required handoff targets
 */
export function validateHandoffTargets(agent: AgentDefinition): string[] {
    const errors: string[] = [];

    for (const handoff of agent.handoffs) {
        const targetPath = join(AGENTS_DIR, `${handoff.to}.md`);
        if (!existsSync(targetPath)) {
            errors.push(`Agent "${agent.name}" references unknown agent: ${handoff.to}`);
        }
    }

    return errors;
}

/**
 * Get all available agent names
 */
export function getAllAgentNames(): string[] {
    const fs = require('fs');
    const files = fs.readdirSync(AGENTS_DIR);
    return files
        .filter((f: string) => f.endsWith('.md'))
        .map((f: string) => f.replace('.md', ''));
}
