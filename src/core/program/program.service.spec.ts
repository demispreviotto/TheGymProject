import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { ProgramService, toPhaseSchedules } from './program.service';

describe('toPhaseSchedules', () => {
  it('flattens the joined plan days', () => {
    const rows = [{
      id: 'ph1', program_id: 'pr', planning_id: 'pl1', position: 1, repeat_count: 4,
      planning: { planning_days: [{ day_number: 1 }, { day_number: 3 }] },
    }];
    expect(toPhaseSchedules(rows)).toEqual([
      { id: 'ph1', planning_id: 'pl1', position: 1, repeat_count: 4, days: [1, 3] },
    ]);
  });

  it('gives a phase no days when its plan is not readable', () => {
    const rows = [{ id: 'ph1', program_id: 'pr', planning_id: 'pl1', position: 1, repeat_count: 1, planning: null }];
    expect(toPhaseSchedules(rows)[0].days).toEqual([]);
  });
});

describe('ProgramService', () => {
  let service: ProgramService;
  let tables: Record<string, QueryMock>;

  beforeEach(() => {
    tables = {};
    const client = { from: vi.fn((t: string) => tables[t]) };
    TestBed.configureTestingModule({ providers: [{ provide: SUPABASE_CLIENT, useValue: client }] });
    service = TestBed.inject(ProgramService);
  });

  describe('loadActive', () => {
    it('returns null when the user follows nothing', async () => {
      tables['user_programs'] = createQueryMock({ data: null });
      expect(await service.loadActive('u1')).toBeNull();
    });

    it('assembles the program, its phases and the completed count', async () => {
      tables['user_programs'] = createQueryMock({ data: { id: 'up1', program_id: 'pr1', status: 'active' } });
      tables['programs'] = createQueryMock({ data: { id: 'pr1', title: 'Cut' } });
      tables['program_phases'] = createQueryMock({
        data: [{ id: 'ph1', planning_id: 'pl1', position: 1, repeat_count: 2, planning: { planning_days: [{ day_number: 1 }] } }],
      });
      tables['workout_sessions'] = createQueryMock({ count: 5 });

      const result = await service.loadActive('u1');

      expect(result?.program.id).toBe('pr1');
      expect(result?.phases).toHaveLength(1);
      expect(result?.completedWorkouts).toBe(5);
      expect(tables['workout_sessions']['eq']).toHaveBeenCalledWith('user_program_id', 'up1');
    });
  });

  describe('follow', () => {
    it('sets the previous program aside, then inserts the new one', async () => {
      tables['user_programs'] = createQueryMock({ error: null });

      expect(await service.follow('u1', 'pr2')).toBeNull();
      expect(tables['user_programs']['update']).toHaveBeenCalledWith({ status: 'abandoned' });
      expect(tables['user_programs']['insert']).toHaveBeenCalledWith({ user_id: 'u1', program_id: 'pr2' });
    });

    it('does not insert when closing the previous program fails', async () => {
      tables['user_programs'] = createQueryMock({ error: { message: 'nope' } });

      expect(await service.follow('u1', 'pr2')).toBe('nope');
      expect(tables['user_programs']['insert']).not.toHaveBeenCalled();
    });
  });

  describe('create / update', () => {
    const phases = [
      { planning_id: 'pl1', repeat_count: 4 },
      { planning_id: 'pl2', repeat_count: 1 },
    ];

    it('creates the program then its phases in order', async () => {
      tables['programs'] = createQueryMock({ data: { id: 'pr1' }, error: null });
      tables['program_phases'] = createQueryMock({ error: null });

      expect(await service.create('u1', 'Cut', phases)).toBeNull();
      expect(tables['programs']['insert']).toHaveBeenCalledWith({ owner_id: 'u1', title: 'Cut' });
      expect(tables['program_phases']['insert']).toHaveBeenCalledWith([
        { program_id: 'pr1', planning_id: 'pl1', repeat_count: 4, position: 1 },
        { program_id: 'pr1', planning_id: 'pl2', repeat_count: 1, position: 2 },
      ]);
    });

    it('does not insert phases when the program insert fails', async () => {
      tables['programs'] = createQueryMock({ data: null, error: { message: 'denied' } });
      tables['program_phases'] = createQueryMock({ error: null });

      expect(await service.create('u1', 'Cut', phases)).toBe('denied');
      expect(tables['program_phases']['insert']).not.toHaveBeenCalled();
    });

    it('update renames, replaces the phases and renumbers them', async () => {
      tables['programs'] = createQueryMock({ error: null });
      tables['program_phases'] = createQueryMock({ error: null });

      expect(await service.update('pr1', 'Bulk', phases)).toBeNull();
      expect(tables['programs']['update']).toHaveBeenCalledWith({ title: 'Bulk' });
      expect(tables['program_phases']['delete']).toHaveBeenCalled();
      expect(tables['program_phases']['eq']).toHaveBeenCalledWith('program_id', 'pr1');
      expect(tables['program_phases']['insert']).toHaveBeenCalled();
    });
  });

  it('complete marks the assignment completed', async () => {
    tables['user_programs'] = createQueryMock({ error: null });

    expect(await service.complete('up1')).toBeNull();
    expect(tables['user_programs']['update']).toHaveBeenCalledWith({ status: 'completed' });
  });
});
