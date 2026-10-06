import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushRequest {
  user_id: string;
  title: string;
  body: string;
  url: string;
}

interface SubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

const MAX_TEXT = 200;
const GONE_STATUSES = [404, 410];

function isValidPayload(value: unknown): value is PushRequest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.user_id === 'string' &&
    typeof v.title === 'string' && v.title.length <= MAX_TEXT &&
    typeof v.body === 'string' && v.body.length <= MAX_TEXT &&
    typeof v.url === 'string' && v.url.startsWith('/')
  );
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function removeSubscription(
  admin: ReturnType<typeof createClient>,
  endpoint: string,
): Promise<void> {
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint);
}

async function deliver(
  admin: ReturnType<typeof createClient>,
  sub: SubscriptionRow,
  message: string,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      message,
    );
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status !== undefined && GONE_STATUSES.includes(status)) {
      await removeSubscription(admin, sub.endpoint);
    }
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  if (req.headers.get('x-push-secret') !== Deno.env.get('PUSH_SHARED_SECRET')) {
    return json(401, { error: 'Unauthorized' });
  }

  const payload: unknown = await req.json().catch(() => null);
  if (!isValidPayload(payload)) return json(400, { error: 'Invalid payload' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', payload.user_id);
  if (error) return json(500, { error: error.message });

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? '',
    Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
    Deno.env.get('VAPID_PRIVATE_KEY') ?? '',
  );

  const message = JSON.stringify({
    notification: {
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      data: { url: payload.url },
    },
  });

  const results = await Promise.all(
    (subs ?? []).map((sub) => deliver(admin, sub as SubscriptionRow, message)),
  );
  return json(200, { sent: results.filter(Boolean).length, attempted: results.length });
});
