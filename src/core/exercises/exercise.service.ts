import { inject, Injectable, signal } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { AuthService } from '../auth/auth.service';
import type { Exercise, MuscleGroup } from '../planning/planning.types';

export interface ExercisePayload {
  name: string;
  definition: string | null;
  recommendations: string | null;
  muscle_groups: MuscleGroup[];
}

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  readonly exercises = signal<Exercise[]>([]);
  readonly loading = signal(false);

  async load(): Promise<void> {
    this.loading.set(true);
    const tenantId = this.auth.profile()?.id;
    const { data } = await this.supabase
      .from('exercises')
      .select('*')
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('name');
    this.exercises.set((data as Exercise[]) ?? []);
    this.loading.set(false);
  }

  async create(payload: ExercisePayload): Promise<string | null> {
    const tenantId = this.auth.profile()?.id;
    const { error } = await this.supabase
      .from('exercises')
      .insert({ ...payload, tenant_id: tenantId });
    if (!error) await this.load();
    return error?.message ?? null;
  }

  async update(id: string, payload: ExercisePayload): Promise<string | null> {
    const { error } = await this.supabase
      .from('exercises')
      .update(payload)
      .eq('id', id);
    if (!error) await this.load();
    return error?.message ?? null;
  }

  async delete(id: string): Promise<string | null> {
    const { error } = await this.supabase
      .from('exercises')
      .delete()
      .eq('id', id);
    if (!error) this.exercises.update(list => list.filter(e => e.id !== id));
    return error?.message ?? null;
  }
}
