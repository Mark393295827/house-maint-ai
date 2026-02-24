import { MessagingChannel, MessagePayload } from '../OmnichannelGateway';

/**
 * src/gateway/channels/WhatsAppChannel.ts
 * 
 * Implements a simulated WhatsApp messaging channel.
 * In production, this would integrate with Meta's Business API or Twilio.
 */
export class WhatsAppChannel extends MessagingChannel {
    name = 'whatsapp';
    private messageHandler: ((payload: MessagePayload) => Promise<void>) | null = null;

    async sendMessage(userId: string, text: string): Promise<void> {
        console.log(`[WhatsApp] Sending message to ${userId}: ${text}`);
        // Meta API integration would go here
    }

    onMessage(handler: (payload: MessagePayload) => Promise<void>): void {
        this.messageHandler = handler;
        console.log('[WhatsApp] Message handler registered.');
    }

    /**
     * Simulation method for triggering messages in dev mode
     */
    simulateIncomingMessage(userId: string, text: string) {
        if (this.messageHandler) {
            this.messageHandler({
                channel: 'whatsapp',
                userId,
                text
            });
        }
    }
}
