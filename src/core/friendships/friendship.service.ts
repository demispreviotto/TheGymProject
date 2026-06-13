import { inject, Injectable, signal, computed } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { AuthService } from '../auth/auth.service';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  requester?: { name: string; email: string };
  addressee?: { name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class FriendshipService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  readonly friendships = signal<Friendship[]>([]);

  readonly friends = computed<Friendship[]>(() =>
    this.friendships().filter(f => f.status === 'accepted'),
  );

  readonly pendingReceived = computed<Friendship[]>(() => {
    const me = this.auth.profile()?.id;
    return this.friendships().filter(f => f.status === 'pending' && f.addressee_id === me);
  });

  readonly pendingSent = computed<Friendship[]>(() => {
    const me = this.auth.profile()?.id;
    return this.friendships().filter(f => f.status === 'pending' && f.requester_id === me);
  });

  async load(): Promise<void> {
    const { data: rows } = await this.supabase
      .from('friendships')
      .select('*')
      .order('created_at', { ascending: false });

    if (!rows?.length) { this.friendships.set([]); return; }

    const ids = [...new Set([
      ...rows.map((r: Friendship) => r.requester_id),
      ...rows.map((r: Friendship) => r.addressee_id),
    ])];

    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', ids);

    const byId = Object.fromEntries(
      ((profiles ?? []) as { id: string; name: string; email: string }[]).map(p => [p.id, p]),
    );

    this.friendships.set(rows.map((r: Friendship) => ({
      ...r,
      requester: byId[r.requester_id],
      addressee: byId[r.addressee_id],
    })));
  }

  async sendRequest(email: string): Promise<string | null> {
    const me = this.auth.profile()?.id;
    const { data: target, error: lookupErr } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (lookupErr) return lookupErr.message;
    if (!target) return 'No account found with that email.';
    if ((target as { id: string }).id === me) return 'You cannot add yourself.';

    const { error } = await this.supabase
      .from('friendships')
      .insert({ requester_id: me, addressee_id: (target as { id: string }).id });
    if (error) return error.message.includes('unique') ? 'Request already sent.' : error.message;
    await this.load();
    return null;
  }

  async accept(id: string): Promise<void> {
    await this.supabase.from('friendships').update({ status: 'accepted' }).eq('id', id);
    this.friendships.update(list =>
      list.map(f => f.id === id ? { ...f, status: 'accepted' } : f),
    );
  }

  async reject(id: string): Promise<void> {
    await this.supabase.from('friendships').update({ status: 'rejected' }).eq('id', id);
    this.friendships.update(list =>
      list.map(f => f.id === id ? { ...f, status: 'rejected' } : f),
    );
  }

  async cancel(id: string): Promise<void> {
    await this.supabase.from('friendships').delete().eq('id', id);
    this.friendships.update(list => list.filter(f => f.id !== id));
  }
}
