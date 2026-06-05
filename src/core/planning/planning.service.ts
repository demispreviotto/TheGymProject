import { inject, Injectable, signal } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { AuthService } from '../auth/auth.service';
import type { Planning, PlanningDay, PrescribedExercise } from './planning.types';
import type { Profile } from '../auth/auth.types';

export interface PrescribedExercisePayload {
  exercise_id: string;
  exigence: 'A' | 'B' | 'C' | 'D';
  rest_time_minutes: number;
  tracking_mode: 'standard' | 'granular' | 'failure';
  rounds: number;
  target_reps: number;
  suggested_first_weight: number | null;
  sorting_order: number;
}

export interface PlanningDayPayload {
  day_number: number;
  exercises: PrescribedExercisePayload[];
}

export interface PlanningPayload {
  title: string;
  use_auto_1rm: boolean;
  days: PlanningDayPayload[];
}

export interface PlanningFull extends Planning {
  planning_days: (PlanningDay & { prescribed_exercises: PrescribedExercise[] })[];
}

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly supabase = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);

  readonly plannings = signal<Planning[]>([]);
  readonly tenantUsers = signal<Profile[]>([]);
  readonly loading = signal(false);

  async loadPlannings(): Promise<void> {
    this.loading.set(true);
    const { data } = await this.supabase
      .from('plannings')
      .select('*')
      .order('created_at', { ascending: false });
    this.plannings.set((data as Planning[]) ?? []);
    this.loading.set(false);
  }

  async loadTenantUsers(): Promise<void> {
    const tenantId = this.auth.profile()?.id;
    const { data } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('tenant_id', tenantId);
    this.tenantUsers.set((data as Profile[]) ?? []);
  }

  async loadFull(planningId: string): Promise<PlanningFull | null> {
    const { data } = await this.supabase
      .from('plannings')
      .select(`
        *,
        planning_days (
          *,
          prescribed_exercises ( * )
        )
      `)
      .eq('id', planningId)
      .single();
    return data as PlanningFull ?? null;
  }

  async create(payload: PlanningPayload): Promise<string | null> {
    const tenantId = this.auth.profile()?.id;

    const { data: planning, error: planErr } = await this.supabase
      .from('plannings')
      .insert({ title: payload.title, use_auto_1rm: payload.use_auto_1rm, tenant_id: tenantId })
      .select()
      .single();
    if (planErr) return planErr.message;

    const err = await this.saveDays((planning as Planning).id, payload.days);
    if (!err) await this.loadPlannings();
    return err;
  }

  async update(id: string, payload: PlanningPayload): Promise<string | null> {
    const { error: planErr } = await this.supabase
      .from('plannings')
      .update({ title: payload.title, use_auto_1rm: payload.use_auto_1rm })
      .eq('id', id);
    if (planErr) return planErr.message;

    // Replace days: delete existing then re-insert (cascade deletes prescribed_exercises)
    const { error: delErr } = await this.supabase
      .from('planning_days')
      .delete()
      .eq('planning_id', id);
    if (delErr) return delErr.message;

    const err = await this.saveDays(id, payload.days);
    if (!err) await this.loadPlannings();
    return err;
  }

  async delete(id: string): Promise<string | null> {
    const { error } = await this.supabase.from('plannings').delete().eq('id', id);
    if (!error) this.plannings.update(list => list.filter(p => p.id !== id));
    return error?.message ?? null;
  }

  async assignPlanning(userId: string, planningId: string | null): Promise<string | null> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ assigned_planning_id: planningId })
      .eq('id', userId);
    if (!error) {
      this.tenantUsers.update(users =>
        users.map(u => u.id === userId ? { ...u, assigned_planning_id: planningId } : u)
      );
    }
    return error?.message ?? null;
  }

  async setShared(planId: string, value: boolean): Promise<string | null> {
    const { error } = await this.supabase
      .from('plannings')
      .update({ is_shared_with_gym: value })
      .eq('id', planId);
    if (!error) {
      this.plannings.update(list =>
        list.map(p => p.id === planId ? { ...p, is_shared_with_gym: value } : p),
      );
    }
    return error?.message ?? null;
  }

  async setSharedWithFriends(planId: string, value: boolean): Promise<string | null> {
    const { error } = await this.supabase
      .from('plannings')
      .update({ is_shared_with_friends: value })
      .eq('id', planId);
    if (!error) {
      this.plannings.update(list =>
        list.map(p => p.id === planId ? { ...p, is_shared_with_friends: value } : p),
      );
    }
    return error?.message ?? null;
  }

  async lookupSharedPlan(planId: string): Promise<Planning | null> {
    const { data } = await this.supabase
      .from('plannings')
      .select('*')
      .eq('id', planId)
      .eq('is_shared_with_gym', true)
      .maybeSingle();
    return (data as Planning) ?? null;
  }

  private async saveDays(planningId: string, days: PlanningDayPayload[]): Promise<string | null> {
    for (const day of days) {
      if (day.exercises.length === 0) continue;

      const { data: dayRow, error: dayErr } = await this.supabase
        .from('planning_days')
        .insert({ planning_id: planningId, day_number: day.day_number })
        .select()
        .single();
      if (dayErr) return dayErr.message;

      const rows = day.exercises.map(e => ({ ...e, planning_day_id: (dayRow as PlanningDay).id }));
      const { error: exErr } = await this.supabase.from('prescribed_exercises').insert(rows);
      if (exErr) return exErr.message;
    }
    return null;
  }
}
