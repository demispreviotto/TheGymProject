import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import type {
  ActiveProgram, PhaseDraft, PhaseSchedule, Program, ProgramPhase, UserProgram,
} from './program.types';

interface PhaseRow extends ProgramPhase {
  planning: { planning_days: { day_number: number }[] } | null;
}

/** Joined phase rows -> the schedule shape position math needs. Pure. */
export function toPhaseSchedules(rows: readonly PhaseRow[]): PhaseSchedule[] {
  return rows.map(r => ({
    id: r.id,
    planning_id: r.planning_id,
    position: r.position,
    repeat_count: r.repeat_count,
    days: (r.planning?.planning_days ?? []).map(d => d.day_number),
  }));
}

@Injectable({ providedIn: 'root' })
export class ProgramService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  /** The program the user is following, with its phases and how many workouts they have logged in it. */
  async loadActive(userId: string): Promise<ActiveProgram | null> {
    const { data: up } = await this.supabase
      .from('user_programs')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    if (!up) return null;
    const userProgram = up as UserProgram;

    const [program, phases, completed] = await Promise.all([
      this.supabase.from('programs').select('*').eq('id', userProgram.program_id).maybeSingle(),
      this.supabase
        .from('program_phases')
        .select('*, planning:plannings(planning_days(day_number))')
        .eq('program_id', userProgram.program_id)
        .order('position'),
      this.supabase
        .from('workout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_program_id', userProgram.id),
    ]);

    if (!program.data) return null;
    return {
      userProgram,
      program: program.data as Program,
      phases: toPhaseSchedules((phases.data as PhaseRow[] | null) ?? []),
      completedWorkouts: completed.count ?? 0,
    };
  }

  /** Starts following a program; whatever the user followed before is set aside. Returns an error message. */
  async follow(userId: string, programId: string): Promise<string | null> {
    const { error: closeErr } = await this.supabase
      .from('user_programs')
      .update({ status: 'abandoned' })
      .eq('user_id', userId)
      .eq('status', 'active');
    if (closeErr) return closeErr.message;

    const { error } = await this.supabase
      .from('user_programs')
      .insert({ user_id: userId, program_id: programId });
    return error?.message ?? null;
  }

  /** Programs the user built (RLS also shows gym-shared ones, so filter by owner). */
  async loadMine(ownerId: string): Promise<Program[]> {
    const { data } = await this.supabase
      .from('programs')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    return (data as Program[] | null) ?? [];
  }

  async loadPhases(programIds: readonly string[]): Promise<ProgramPhase[]> {
    if (!programIds.length) return [];
    const { data } = await this.supabase
      .from('program_phases')
      .select('*')
      .in('program_id', programIds)
      .order('position');
    return (data as ProgramPhase[] | null) ?? [];
  }

  async loadOne(programId: string): Promise<{ program: Program; phases: ProgramPhase[] } | null> {
    const { data } = await this.supabase.from('programs').select('*').eq('id', programId).maybeSingle();
    if (!data) return null;
    return { program: data as Program, phases: await this.loadPhases([programId]) };
  }

  async create(ownerId: string, title: string, phases: readonly PhaseDraft[]): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('programs')
      .insert({ owner_id: ownerId, title })
      .select('id')
      .single();
    if (error) return error.message;
    return this.insertPhases((data as { id: string }).id, phases);
  }

  async update(programId: string, title: string, phases: readonly PhaseDraft[]): Promise<string | null> {
    const { error } = await this.supabase.from('programs').update({ title }).eq('id', programId);
    if (error) return error.message;
    const { error: delErr } = await this.supabase.from('program_phases').delete().eq('program_id', programId);
    if (delErr) return delErr.message;
    return this.insertPhases(programId, phases);
  }

  async remove(programId: string): Promise<string | null> {
    const { error } = await this.supabase.from('programs').delete().eq('id', programId);
    return error?.message ?? null;
  }

  async setSharedWithFriends(programId: string, shared: boolean): Promise<string | null> {
    const { error } = await this.supabase
      .from('programs')
      .update({ is_shared_with_friends: shared })
      .eq('id', programId);
    return error?.message ?? null;
  }

  private async insertPhases(programId: string, phases: readonly PhaseDraft[]): Promise<string | null> {
    if (!phases.length) return null;
    const { error } = await this.supabase.from('program_phases').insert(
      phases.map((p, index) => ({
        program_id: programId,
        planning_id: p.planning_id,
        repeat_count: p.repeat_count,
        position: index + 1,
      })),
    );
    return error?.message ?? null;
  }

  async complete(userProgramId: string): Promise<string | null> {
    const { error } = await this.supabase
      .from('user_programs')
      .update({ status: 'completed' })
      .eq('id', userProgramId);
    return error?.message ?? null;
  }
}
