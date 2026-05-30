import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import type { Exercise, PrescribedExercise, WorkoutSession, WorkoutLog } from '../planning/planning.types';

export interface WorkoutPrescribed extends Omit<PrescribedExercise, 'exercise'> {
  exercise: Exercise | null;
}

export interface WorkoutPlanDay {
  id: string;
  planning_id: string;
  day_number: number;
  prescribed_exercises: WorkoutPrescribed[];
}

export interface WorkoutPlanFull {
  id: string;
  tenant_id: string;
  title: string;
  use_auto_1rm: boolean;
  created_at: string;
  planning_days: WorkoutPlanDay[];
}

export interface LogPayload {
  exercise_id: string;
  round_number: number;
  weight_used: number;
  reps_performed: number;
  is_completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async loadPlan(planningId: string): Promise<WorkoutPlanFull | null> {
    const { data } = await this.supabase
      .from('plannings')
      .select(`
        *,
        planning_days (
          *,
          prescribed_exercises (
            *,
            exercise:exercises (*)
          )
        )
      `)
      .eq('id', planningId)
      .maybeSingle();
    return (data as WorkoutPlanFull) ?? null;
  }

  async loadLastSession(userId: string, planningId: string): Promise<WorkoutSession | null> {
    const { data } = await this.supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('planning_id', planningId)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as WorkoutSession) ?? null;
  }

  async loadLastLog(userId: string, exerciseId: string): Promise<WorkoutLog | null> {
    const { data: sessions } = await this.supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(20);

    if (!sessions?.length) return null;
    const sessionIds = (sessions as { id: string }[]).map(s => s.id);

    const { data } = await this.supabase
      .from('workout_logs')
      .select('*')
      .in('session_id', sessionIds)
      .eq('exercise_id', exerciseId)
      .eq('is_completed', true)
      .limit(1)
      .maybeSingle();

    return (data as WorkoutLog) ?? null;
  }

  async saveSession(
    userId: string,
    planningId: string,
    dayNumber: number,
    subjectiveScore: number,
    logs: LogPayload[],
  ): Promise<string | null> {
    const { data: session, error: sessErr } = await this.supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        planning_id: planningId,
        day_number: dayNumber,
        subjective_score: subjectiveScore,
      })
      .select()
      .single();
    if (sessErr) return sessErr.message;

    const logRows = logs.map(l => ({ ...l, session_id: (session as WorkoutSession).id }));
    const { error: logsErr } = await this.supabase.from('workout_logs').insert(logRows);
    return logsErr?.message ?? null;
  }

  resolveActiveDay(lastSession: WorkoutSession | null, availableDays: number[]): number {
    const sorted = [...availableDays].sort((a, b) => a - b);
    if (!sorted.length) return 1;
    if (!lastSession) return sorted[0];
    const lastIdx = sorted.indexOf(lastSession.day_number);
    if (lastIdx === -1 || lastIdx === sorted.length - 1) return sorted[0];
    return sorted[lastIdx + 1];
  }

  computeSuggestedWeight(
    log: WorkoutLog | null,
    targetReps: number,
    fallback: number | null,
  ): number | null {
    if (!log) return fallback;
    const oneRM = log.weight_used * (1 + log.reps_performed / 30);
    return Math.round((oneRM / (1 + targetReps / 30)) * 4) / 4;
  }
}
