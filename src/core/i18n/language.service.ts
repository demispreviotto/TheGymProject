import { inject, Injectable, signal } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { translate } from './i18n.dictionary';
import type { Language, Profile } from '../auth/auth.types';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  readonly activeLanguage = signal<Language>('en');

  initFromProfile(profile: Profile): void {
    this.activeLanguage.set(profile.preferred_language ?? 'en');
  }

  async setLanguage(lang: Language): Promise<void> {
    this.activeLanguage.set(lang);
    const { data: { user } } = await this.supabase.auth.getUser();
    if (user) {
      await this.supabase
        .from('profiles')
        .update({ preferred_language: lang })
        .eq('id', user.id);
    }
  }

  t(key: string): string {
    return translate(key, this.activeLanguage());
  }
}
