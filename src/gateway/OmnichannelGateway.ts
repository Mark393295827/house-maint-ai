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
            // TODO: Route to AgenticBrain for diagnosis
        });
    }

    async broadcast(text: string) {
        for (const [name] of this.channels) {
            console.log(`[Gateway] Broadcasting: ${text} to ${name}...`);
            // In a real app, this would iterate over active users
        }
    }
}

export const gateway = new OmnichannelGateway();
