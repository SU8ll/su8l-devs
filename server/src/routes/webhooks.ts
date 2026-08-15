import { Router } from 'express';
import express from 'express';
import { getOrder, markOrderDenied } from '../db.js';
import { verifyWebhookSignature } from '../lib/paypal.js';
import { fulfillOrder } from '../services/orders.js';

const router = Router();

// PayPal webhooks arrive as raw JSON so we can verify the transmission signature.
router.post('/paypal', express.raw({ type: 'application/json' }), async (req, res) => {
  const rawBody = (req.body as Buffer).toString('utf8');

  const verified = await verifyWebhookSignature(req.headers as Record<string, unknown>, rawBody);
  if (!verified) {
    return res.status(400).json({ error: 'invalid webhook signature' });
  }

  let event: {
    event_type?: string;
    resource?: { custom_id?: string; id?: string; status?: string };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'malformed payload' });
  }

  // Acknowledge immediately (PayPal will retry if we don't), then fulfill synchronously.
  res.json({ received: true });

  try {
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const customId = event.resource?.custom_id;
        const captureId = event.resource?.id ?? null;
        if (customId) await fulfillOrder(customId, captureId);
        break;
      }
      case 'PAYMENT.CAPTURE.DENIED':
      case 'CHECKOUT.ORDER.DENIED': {
        const customId = event.resource?.custom_id;
        if (customId) {
          const order = await getOrder(customId);
          if (order) await markOrderDenied(order.id);
        }
        break;
      }
      default:
        // Irrelevant event types are ignored.
        break;
    }
  } catch (err) {
    console.error('[webhook:paypal]', err);
  }
});

export default router;
