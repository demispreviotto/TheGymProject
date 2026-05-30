import { inject, Injectable, computed } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../theme/theme.service';
import type { Tenant } from '../auth/auth.types';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly theme = inject(ThemeService);

  readonly tenant = computed(() => this.auth.tenant());

  async update(patch: Partial<Pick<Tenant, 'name' | 'logo_svg' | 'primary_hex'>>): Promise<string | null> {
    const id = this.tenant()?.id;
    if (!id) return 'No tenant loaded';
    const { error } = await this.supabase.from('tenants').update(patch).eq('id', id);
    if (!error) {
      this.auth.patchTenant(patch);
      const updated = this.auth.tenant();
      if (updated) this.theme.applyFromTenant(updated);
    }
    return error?.message ?? null;
  }
}
