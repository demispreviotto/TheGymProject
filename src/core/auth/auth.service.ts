import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { ThemeService } from '../theme/theme.service';
import type { Profile } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);

  readonly profile = signal<Profile | null>(null);
  readonly isLoading = signal(true);

  initialize(): void {
    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.loadProfile(session.user.id);
      } else {
        this.profile.set(null);
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
    this.router.navigate(['/login']);
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      this.profile.set(data as Profile);
      this.theme.applyFromProfile(data as Profile);
      this.redirectByRole((data as Profile).role);
    }
    this.isLoading.set(false);
  }

  private async upsertProfile(id: string, email: string, name: string): Promise<void> {
    await this.supabase
      .from('profiles')
      .upsert({ id, email, name, role: 'free' }, { onConflict: 'id' });
  }

  private redirectByRole(role: Profile['role']): void {
    const current = this.router.url;
    if (current === '/login' || current === '/') {
      this.router.navigate([role === 'trainer' ? '/trainer' : '/dashboard']);
    }
  }
}
