import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import type { Profile } from '../auth/auth.types';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  /**
   * A trainer's clients: the profiles whose `tenant_id` is the trainer's own user id, which is what
   * `invite-client` stores and what the RLS policy compares. (`tenant_id` is not the id of the trainer's
   * row in `tenants`; that one lives in `tenant_ref_id`.)
   */
  async loadForTrainer(trainerId: string): Promise<Profile[]> {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', trainerId)
      .neq('id', trainerId)
      .order('name');
    return (data as Profile[] | null) ?? [];
  }
}
