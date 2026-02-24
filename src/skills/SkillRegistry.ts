/**
 * src/skills/SkillRegistry.ts
 * 
 * Manages proactive agentic skills. 
 * Skills are background tasks that can trigger interventions or reporting.
 */

export interface MaintenanceSkill {
    id: string;
    name: string;
    description: string;
    schedule: string; // Cron expression
    execute(): Promise<void>;
}

class SkillRegistry {
    private skills: Map<string, MaintenanceSkill> = new Map();

    registerSkill(skill: MaintenanceSkill) {
        this.skills.set(skill.id, skill);
        console.log(`[Skills] Registered proactive skill: ${skill.name}`);
    }

    async runAll() {
        for (const skill of this.skills.values()) {
            console.log(`[Skills] Running ${skill.name}...`);
            await skill.execute();
        }
    }
}

export const skillRegistry = new SkillRegistry();
