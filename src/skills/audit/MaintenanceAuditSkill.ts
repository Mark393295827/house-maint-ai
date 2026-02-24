/**
 * src/skills/audit/MaintenanceAuditSkill.ts
 * 
 * An agentic skill that periodically audits the maintenance history
 * and proactively suggests interventions.
 */

import { MaintenanceSkill } from '../SkillRegistry';
import { getCases } from '../../store/cases';
import { addInsight } from '../../store/proactive';

export class MaintenanceAuditSkill implements MaintenanceSkill {
    id = 'maintenance-audit';
    name = 'Maintenance History Audit';
    description = 'Analyzes history to suggest preventative maintenance.';
    schedule = '0 0 * * *'; // Every midnight

    async execute(): Promise<void> {
        const cases = getCases();

        // Logic: suggesting a plumbing check if no plumbing cases in 6 months
        const hasRecentPlumbing = cases.some(c =>
            c.category?.toLowerCase() === 'plumbing' &&
            new Date(c.date) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        );

        if (!hasRecentPlumbing) {
            console.log(`[Audit Skill] Proactively suggesting intervention.`);
            addInsight({
                titleKey: 'proactive.insight2.title',
                bodyKey: 'proactive.insight2.body',
                type: 'maintenance',
                actionLabelKey: 'proactive.action',
                actionPath: '/diagnosis'
            });
        }
    }
}
