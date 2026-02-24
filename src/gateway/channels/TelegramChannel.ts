import { MessagingChannel, MessagePayload } from '../OmnichannelGateway';

/**
 * src/gateway/channels/TelegramChannel.ts
 * 
 * Implements the Telegram messaging gateway adapter.
 * Uses environment variables for Bot Token.
 */
export class TelegramChannel extends MessagingChannel {
    name = 'telegram';
    private token: string;
    private messageHandler: ((payload: MessagePayload) => Promise<void>) | null = null;

    constructor(token: string) {
        super();
        this.token = token;
    }

    async sendMessage(userId: string, text: string): Promise<void> {
        console.log(`[Telegram] Sending message to ${userId}: ${text}`);
        if (!this.token || this.token === 'YOUR_TELEGRAM_TOKEN') {
            console.warn('[Telegram] No token found. Simulated send.');
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: userId, text })
            });
        } catch (e) {
            console.error('[Telegram] Failed to send message:', e);
        }
    }

    onMessage(handler: (payload: MessagePayload) => Promise<void>): void {
        this.messageHandler = handler;
        console.log('[Telegram] Message handler registered.');

        // This is a stub for polling/webhook integration
        // In a real environment, you'd implement a polling loop or an Express endpoint
    }

    /**
     * Simulation method for triggering messages in dev mode
     */
    simulateIncomingMessage(userId: string, text: string) {
        if (this.messageHandler) {
            this.messageHandler({
                channel: 'telegram',
                userId,
                text
            });
        }
    }
}
