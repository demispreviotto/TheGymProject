import { inject, Injectable, signal, computed } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { AuthService } from '../auth/auth.service';

export interface InviteRequest {
  id: string;
  requester_id: string;
  invitee_email: string;
  invitee_name: string;
  reason: string;
  accepted_responsibility: boolean;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id: string | null;
  reviewer_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  requester?: { name: string; email: string };
}

/** How many invite requests a user can have pending or approved at the same time. */
export const MAX_INVITE_REQUESTS = 2;

@Injectable({ providedIn: 'root' })
export class InviteRequestService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  readonly myRequests = signal<InviteRequest[]>([]);
  readonly allRequests = signal<InviteRequest[]>([]);

  /** Slots in use: a pending request holds one until it is decided, an approved one keeps it. A rejected request frees it. */
  readonly usedInvites = computed(
    () => this.myRequests().filter(r => r.status === 'pending' || r.status === 'approved').length,
  );

  /** What the Profile page shows, and exactly what submitRequest enforces: the two cannot disagree. */
  readonly remainingInvites = computed(() => Math.max(0, MAX_INVITE_REQUESTS - this.usedInvites()));

  readonly pendingCount = computed(
    () => this.allRequests().filter(r => r.status === 'pending').length,
  );

  async loadMyRequests(): Promise<void> {
    const { data } = await this.supabase
      .from('invite_requests')
      .select('*')
      .eq('requester_id', this.auth.profile()!.id)
      .order('created_at', { ascending: false });
    this.myRequests.set((data as InviteRequest[]) ?? []);
  }

  async loadAllRequests(): Promise<void> {
    const { data: requests, error: reqErr } = await this.supabase
      .from('invite_requests')
      .select('*')
      .order('status')
      .order('created_at', { ascending: false });

    console.log('[InviteReq] requests:', requests, 'error:', reqErr);

    if (!requests?.length) { this.allRequests.set([]); return; }

    const requesterIds = [...new Set(requests.map((r: InviteRequest) => r.requester_id))];
    const { data: profiles, error: profErr } = await this.supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', requesterIds);

    console.log('[InviteReq] profiles for', requesterIds, ':', profiles, 'error:', profErr);

    const byId = Object.fromEntries(
      ((profiles ?? []) as { id: string; name: string; email: string }[]).map(p => [p.id, p]),
    );

    this.allRequests.set(
      requests.map((r: InviteRequest) => ({ ...r, requester: byId[r.requester_id] })),
    );
  }

  async submitRequest(
    inviteeEmail: string,
    inviteeName: string,
    reason: string,
  ): Promise<string | null> {
    const requesterId = this.auth.profile()?.id;
    if (!requesterId) return 'Not authenticated';

    if (this.remainingInvites() === 0) {
      return `You have reached the maximum of ${MAX_INVITE_REQUESTS} invite requests.`;
    }

    const { error } = await this.supabase.from('invite_requests').insert({
      requester_id: requesterId,
      invitee_email: inviteeEmail,
      invitee_name: inviteeName,
      reason,
      accepted_responsibility: true,
    });
    if (error) return error.message;
    await this.loadMyRequests();
    return null;
  }

  async approveRequest(id: string, inviteeEmail: string): Promise<string | null> {
    const reviewerId = this.auth.profile()?.id;

    // Send the invite email via Edge Function
    const { error: fnErr } = await this.supabase.functions.invoke('invite-client', {
      body: { email: inviteeEmail, role: 'free' },
    });
    if (fnErr) return fnErr.message;

    const { error } = await this.supabase
      .from('invite_requests')
      .update({ status: 'approved', reviewer_id: reviewerId, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return error.message;
    await this.loadAllRequests();
    return null;
  }

  async rejectRequest(id: string, note?: string): Promise<string | null> {
    const reviewerId = this.auth.profile()?.id;
    const { error } = await this.supabase
      .from('invite_requests')
      .update({
        status: 'rejected',
        reviewer_id: reviewerId,
        reviewer_note: note ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) return error.message;
    await this.loadAllRequests();
    return null;
  }
}
