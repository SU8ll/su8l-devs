import axios from 'axios';
import { config, PAYPAL_BASE } from '../config.js';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;
  const res = await axios.post(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: config.paypal.clientId, password: config.paypal.clientSecret },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  cachedToken = {
    token: res.data.access_token as string,
    expiresAt: Date.now() + (res.data.expires_in as number) * 1000,
  };
  return cachedToken.token;
}

export interface CreateOrderInput {
  referenceId: string;
  orderId: string;
  description: string;
  amount: number;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPayPalOrder(input: CreateOrderInput) {
  const token = await getAccessToken();
  const res = await axios.post(
    `${PAYPAL_BASE}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.referenceId,
          description: input.description,
          custom_id: input.orderId,
          amount: { currency_code: input.currency, value: input.amount.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: 'SU8L DEVs',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = res.data as {
    id: string;
    status: string;
    links: { rel: string; href: string; method: string }[];
  };
  const approve = data.links.find((l) => l.rel === 'approve');
  if (!approve) throw new Error('PayPal order did not return an approve link');
  return { id: data.id, status: data.status, approvalUrl: approve.href };
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<{
  status: string;
  captureId: string | null;
  captureStatus: string | null;
}> {
  const token = await getAccessToken();
  const res = await axios.post(
    `${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}/capture`,
    {},
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  const data = res.data as {
    status: string;
    purchase_units?: {
      payments?: { captures?: { id: string; status: string }[] };
    }[];
  };
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    status: data.status,
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
  };
}

export async function getPayPalOrder(paypalOrderId: string): Promise<{ status: string }> {
  const token = await getAccessToken();
  const res = await axios.get(`${PAYPAL_BASE}/v2/checkout/orders/${paypalOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return { status: res.data.status as string };
}

export async function verifyWebhookSignature(headers: Record<string, unknown>, rawBody: string): Promise<boolean> {
  if (!config.paypal.webhookId) {
    // Signature verification is mandatory when a webhook id is configured.
    // Without one (local dev) we skip verification — never deploy like this.
    return true;
  }
  const transmissionId = String(headers['paypal-transmission-id'] ?? '');
  const transmissionTime = String(headers['paypal-transmission-time'] ?? '');
  const transmissionSig = String(headers['paypal-transmission-sig'] ?? '');
  const certUrl = String(headers['paypal-cert-url'] ?? '');
  const authAlgo = String(headers['paypal-auth-algo'] ?? '');
  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) return false;

  const token = await getAccessToken();
  const res = await axios.post(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: config.paypal.webhookId,
      webhook_event: JSON.parse(rawBody),
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data.verification_status === 'SUCCESS';
}
