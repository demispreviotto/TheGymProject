import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwPush } from '@angular/service-worker';
import { map } from 'rxjs';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { VAPID_PUBLIC_KEY } from './push.config';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly supabase = inject(SUPABASE_CLIENT);

  readonly isSupported = this.swPush.isEnabled;

  readonly isSubscribed = toSignal(
    this.swPush.subscription.pipe(map((sub) => sub !== null)),
    { initialValue: false },
  );

  async enable(): Promise<void> {
    const subscription = await this.swPush.requestSubscription({
      serverPublicKey: VAPID_PUBLIC_KEY,
    });
    await this.saveSubscription(subscription);
  }

  private async saveSubscription(subscription: PushSubscription): Promise<void> {
    const json = subscription.toJSON();
    const p256dh = json.keys?.['p256dh'];
    const auth = json.keys?.['auth'];
    const endpoint = json.endpoint;
    if (!endpoint || !p256dh || !auth) throw new Error('Incomplete push subscription');

    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return;

    const { error } = await this.supabase
      .from('push_subscriptions')
      .upsert({ user_id: user.id, endpoint, p256dh, auth }, { onConflict: 'endpoint' });
    if (error) throw error;
  }
}
