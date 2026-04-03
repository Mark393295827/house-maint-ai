/**
 * src/gateway/OmnichannelGateway.ts
 * 
 * Manages the connection between the Agentic Brain and external messaging channels.
 * Inspired by OpenClaw's Gateway protocol.
 */

export interface MessagePayload {
    channel: 'telegram' | 'whatsapp' | 'discord' | 'imessage';
    userId: string;
    text: string;
    mediaUrl?: string; // For photo reporting via Gemini Vision
}

export abstract class MessagingChannel {
    abstract name: string;
    abstract sendMessage(userId: string, text: string): Promise<void>;
    abstract onMessage(handler: (payload: MessagePayload) => Promise<void>): void;
}

class OmnichannelGateway {
    private channels: Map<string, MessagingChannel> = new Map();

    registerChannel(channel: MessagingChannel) {
        this.channels.set(channel.name, channel);
        console.log(`[Gateway] Registered channel: ${channel.name}`);

        channel.onMessage(async (payload) => {
            console.log(`[Gateway] Received message from ${payload.userId} on ${payload.channel}: ${payload.text}`);
            // Route incoming message to diagnosis flow
            // In production, this would call the AgenticBrain service
            await this.handleIncomingMessage(payload);
        });
    }

    private async handleIncomingMessage(payload: MessagePayload) {
        const channel = this.channels.get(payload.channel);
        if (channel) {
            // Acknowledge receipt and route to diagnosis pipeline
            await channel.sendMessage(payload.userId, 'Your report has been received. An AI diagnosis is in progress...');
        }
    }

    async broadcast(text: string) {
        for (const [name] of this.channels) {
            console.log(`[Gateway] Broadcasting: ${text} to ${name}...`);
            // In a real app, this would iterate over active users
        }
    }
}

export const gateway = new OmnichannelGateway();
