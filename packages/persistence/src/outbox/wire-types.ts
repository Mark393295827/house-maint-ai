import { DeliveryEnvelopeSchema, DeliveryReceiptSchema } from '@house-maint/contracts';

export type DeliveryEnvelope = ReturnType<typeof DeliveryEnvelopeSchema.parse>;
export type DeliveryReceipt = ReturnType<typeof DeliveryReceiptSchema.parse>;

export { DeliveryEnvelopeSchema, DeliveryReceiptSchema };
