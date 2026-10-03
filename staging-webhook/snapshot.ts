import { supportedPaymentEvent, providerDate, type PaymentSnapshot } from '../src/lib/payments/state';
export function snapshot(raw:Buffer,digest:string):PaymentSnapshot|null {
 const e=JSON.parse(raw.toString('utf8'));
 if(!supportedPaymentEvent(e.event))return null;
 const date=providerDate;
 const entity=e.payload?.subscription?.entity,occurredAt=date(e.created_at);
 if(typeof entity?.id!=='string'||!entity.id||!occurredAt)throw new Error('Invalid payment event');
 return {eventType:e.event,providerSubscriptionId:entity.id,occurredAt,receipt:{id:`body-${digest}`,payloadHash:digest},paymentId:typeof e.payload?.payment?.entity?.id==='string'?e.payload.payment.entity.id:undefined,paymentConfirmed:e.payload?.payment?.entity?.status==='captured',currentStart:date(entity.current_start),currentEnd:date(entity.current_end)};
}
