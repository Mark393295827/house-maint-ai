import { gateway } from './gateway/OmnichannelGateway';
import { TelegramChannel } from './gateway/channels/TelegramChannel';
import { WhatsAppChannel } from './gateway/channels/WhatsAppChannel';
import { skillRegistry } from './skills/SkillRegistry';
import { MaintenanceAuditSkill } from './skills/audit/MaintenanceAuditSkill';

/**
 * Initializes the Agentic Stack (Omnichannel Gateway + Skills Registry).
 * Inspired by OpenClaw's ambient assistant architecture.
 */
export function initAgenticStack() {
    console.log('[Agentic] Initializing OpenClaw-inspired stack...');

    // 1. Register Messaging Channels
    const telegram = new TelegramChannel(import.meta.env.VITE_TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_TOKEN');
    const whatsapp = new WhatsAppChannel();

    gateway.registerChannel(telegram);
    gateway.registerChannel(whatsapp);

    // 2. Register Proactive Skills
    const auditSkill = new MaintenanceAuditSkill();
    skillRegistry.registerSkill(auditSkill);

    // 3. Trigger initial startup audit (Simulated cron)
    // In production, this would be managed by a separate background worker or a cron job.
    setTimeout(() => {
        console.log('[Agentic] Running startup maintenance audit...');
        skillRegistry.runAll();
    }, 5000); // Wait 5s after startup
}
