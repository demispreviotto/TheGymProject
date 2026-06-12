import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { ThemeService } from '../theme/theme.service';
import { LanguageService } from '../i18n/language.service';
import type { Profile, Tenant } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  private readonly lang = inject(LanguageService);

  readonly profile = signal<Profile | null>(null);
  readonly tenant = signal<Tenant | null>(null);
  readonly isLoading = signal(true);

  patchTenant(patch: Partial<Tenant>): void {
    const current = this.tenant();
    if (current) this.tenant.set({ ...current, ...patch });
  }

  initialize(): void {
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        this.router.navigate(['/reset-password']);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user) {
        // Invite links carry type=invite in the URL hash — always send to /register
        // so the user can set their password before we load their profile.
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        if (hash.get('type') === 'invite') {
          this.router.navigate(['/register']);
          return;
        }
        this.loadProfile(session.user.id);
        return;
      }
      if (session?.user) {
        this.loadProfile(session.user.id);
      } else {
        this.profile.set(null);
        this.tenant.set(null);
        this.isLoading.set(false);
      }
    });
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async signUp(email: string, password: string, name: string): Promise<string | null> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return error.message;
    if (data.user) await this.upsertProfile(data.user.id, email, name);
    return null;
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
    this.profile.set(null);
    this.tenant.set(null);
    this.router.navigate(['/login']);
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data } = await this.supabase
      .from('profiles')
      .select('*, tenant:tenants!tenant_ref_id(*)')
      .eq('id', userId)
      .single();

    if (data) {
      const { tenant, ...profileData } = data as { tenant: Tenant | null } & Profile;
      this.profile.set(profileData);
      this.tenant.set(tenant ?? null);
      this.theme.applyFromTenant(tenant ?? null);
      this.lang.initFromProfile(profileData);
      this.redirectByRole(profileData.role);
    }
    this.isLoading.set(false);
  }

  private async upsertProfile(id: string, email: string, name: string): Promise<void> {
    await this.supabase
      .from('profiles')
      .upsert({ id, email, name, role: 'free' }, { onConflict: 'id' });
  }

  async refreshProfile(): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) await this.loadProfile(user.id);
  }

  private redirectByRole(role: Profile['role']): void {
    const current = this.router.url;
    if (current === '/login' || current === '/') {
      if (role === 'admin') this.router.navigate(['/admin']);
      else if (role === 'trainer') this.router.navigate(['/trainer']);
      else this.router.navigate(['/dashboard']);
    }
  }
}
