import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import type { Profile } from '../auth/auth.types';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createClientMock, createQueryMock, QueryMock } from '../../testing/supabase-mock';
import type { Planning } from './planning.types';
import { PlanningPayload, PlanningService } from './planning.service';

const plan = (id: string, extra: Partial<Planning> = {}) =>
  ({ id, title: id, is_shared_with_gym: false, is_shared_with_friends: false, ...extra } as Planning);
const user = (id: string) => ({ id, assigned_planning_id: null } as Profile);
const exercise = (id: string) => ({
  exercise_id: id, exigence: 'A' as const, rest_time_minutes: 2, tracking_mode: 'standard' as const,
  rounds: 3, target_reps: 10, suggested_first_weight: null, sorting_order: 1,
});

describe('PlanningService', () => {
  let service: PlanningService;
  let tables: Record<string, QueryMock>;

  const setup = (t: Record<string, QueryMock>) => {
    tables = t;
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: createClientMock(tables) },
        { provide: AuthService, useValue: { profile: signal({ id: 'me' } as Profile) } },
      ],
    });
    service = TestBed.inject(PlanningService);
  };

  describe('loadPlannings', () => {
    it('stores the rows and clears the loading flag', async () => {
      setup({ plannings: createQueryMock({ data: [plan('a'), plan('b')] }) });
      await service.loadPlannings();
      expect(service.plannings().map(p => p.id)).toEqual(['a', 'b']);
      expect(service.loading()).toBeFalse();
    });

    it('falls back to an empty list when no data comes back', async () => {
      setup({ plannings: createQueryMock({ data: null }) });
      service.plannings.set([plan('stale')]);
      await service.loadPlannings();
      expect(service.plannings()).toEqual([]);
    });
  });

  describe('loadTenantUsers', () => {
    it('queries profiles of the current tenant', async () => {
      setup({ profiles: createQueryMock({ data: [user('u1')] }) });
      await service.loadTenantUsers();
      expect(tables['profiles']['eq']).toHaveBeenCalledWith('tenant_id', 'me');
      expect(service.tenantUsers().length).toBe(1);
    });
  });

  describe('loadFull / lookupSharedPlan', () => {
    it('loadFull returns the nested plan or null', async () => {
      setup({ plannings: createQueryMock({ data: { id: 'p1', planning_days: [] } }) });
      expect((await service.loadFull('p1'))?.id).toBe('p1');
    });

    it('loadFull returns null when nothing is found', async () => {
      setup({ plannings: createQueryMock({ data: null }) });
      expect(await service.loadFull('p1')).toBeNull();
    });

    it('lookupSharedPlan only matches plans shared with the gym', async () => {
      setup({ plannings: createQueryMock({ data: plan('p1') }) });
      expect((await service.lookupSharedPlan('p1'))?.id).toBe('p1');
      expect(tables['plannings']['eq']).toHaveBeenCalledWith('is_shared_with_gym', true);
    });

    it('lookupSharedPlan returns null for unknown or private plans', async () => {
      setup({ plannings: createQueryMock({ data: null }) });
      expect(await service.lookupSharedPlan('x')).toBeNull();
    });
  });

  describe('create', () => {
    const payload: PlanningPayload = {
      title: 'Push/Pull',
      use_auto_1rm: true,
      days: [
        { day_number: 1, exercises: [exercise('e1'), exercise('e2')] },
        { day_number: 2, exercises: [] },
      ],
    };

    it('inserts plan owned by the current user, non-empty days and their exercises, then reloads', async () => {
      setup({
        plannings: createQueryMock([{ data: { id: 'p1' } }, { data: [plan('p1')] }]),
        planning_days: createQueryMock({ data: { id: 'd1' } }),
        prescribed_exercises: createQueryMock({ error: null }),
      });

      expect(await service.create(payload)).toBeNull();

      expect(tables['plannings']['insert']).toHaveBeenCalledWith({
        title: 'Push/Pull', use_auto_1rm: true, tenant_id: 'me',
      });
      expect(tables['planning_days']['insert']).toHaveBeenCalledOnceWith({ planning_id: 'p1', day_number: 1 });
      const rows = tables['prescribed_exercises']['insert'].calls.mostRecent().args[0];
      expect(rows.length).toBe(2);
      expect(rows.every((r: { planning_day_id: string }) => r.planning_day_id === 'd1')).toBeTrue();
      expect(service.plannings().map(p => p.id)).toEqual(['p1']);
    });

    it('returns the plan insert error and writes nothing else', async () => {
      setup({
        plannings: createQueryMock({ data: null, error: { message: 'denied' } }),
        planning_days: createQueryMock(),
      });
      expect(await service.create(payload)).toBe('denied');
      expect(tables['planning_days']['insert']).not.toHaveBeenCalled();
    });

    it('stops on a day error without reloading plans', async () => {
      setup({
        plannings: createQueryMock({ data: { id: 'p1' } }),
        planning_days: createQueryMock({ data: null, error: { message: 'day failed' } }),
        prescribed_exercises: createQueryMock(),
      });
      expect(await service.create(payload)).toBe('day failed');
      expect(tables['prescribed_exercises']['insert']).not.toHaveBeenCalled();
      expect(tables['plannings']['select']).toHaveBeenCalledTimes(1); // only the insert's .select(), no reload
    });

    it('returns the prescribed exercises error', async () => {
      setup({
        plannings: createQueryMock({ data: { id: 'p1' } }),
        planning_days: createQueryMock({ data: { id: 'd1' } }),
        prescribed_exercises: createQueryMock({ error: { message: 'ex failed' } }),
      });
      expect(await service.create(payload)).toBe('ex failed');
    });
  });

  describe('update', () => {
    const payload: PlanningPayload = { title: 'New', use_auto_1rm: false, days: [{ day_number: 3, exercises: [exercise('e1')] }] };

    it('updates the plan, replaces its days and reloads', async () => {
      setup({
        plannings: createQueryMock([{ error: null }, { data: [plan('p1')] }]),
        planning_days: createQueryMock({ data: { id: 'd9' }, error: null }),
        prescribed_exercises: createQueryMock({ error: null }),
      });

      expect(await service.update('p1', payload)).toBeNull();

      expect(tables['plannings']['update']).toHaveBeenCalledWith({ title: 'New', use_auto_1rm: false });
      expect(tables['planning_days']['delete']).toHaveBeenCalled();
      expect(tables['planning_days']['eq']).toHaveBeenCalledWith('planning_id', 'p1');
      expect(tables['planning_days']['insert']).toHaveBeenCalledWith({ planning_id: 'p1', day_number: 3 });
      expect(service.plannings().length).toBe(1);
    });

    it('does not touch days when the plan update fails', async () => {
      setup({
        plannings: createQueryMock({ error: { message: 'nope' } }),
        planning_days: createQueryMock(),
      });
      expect(await service.update('p1', payload)).toBe('nope');
      expect(tables['planning_days']['delete']).not.toHaveBeenCalled();
    });

    it('does not re-insert days when deleting the old ones fails', async () => {
      setup({
        plannings: createQueryMock({ error: null }),
        planning_days: createQueryMock({ error: { message: 'delete failed' } }),
      });
      expect(await service.update('p1', payload)).toBe('delete failed');
      expect(tables['planning_days']['insert']).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes the plan from the list on success', async () => {
      setup({ plannings: createQueryMock({ error: null }) });
      service.plannings.set([plan('a'), plan('b')]);
      expect(await service.delete('a')).toBeNull();
      expect(service.plannings().map(p => p.id)).toEqual(['b']);
    });

    it('keeps the list and returns the message on failure', async () => {
      setup({ plannings: createQueryMock({ error: { message: 'fk' } }) });
      service.plannings.set([plan('a')]);
      expect(await service.delete('a')).toBe('fk');
      expect(service.plannings().length).toBe(1);
    });
  });

  describe('assignPlanning', () => {
    it('updates only the targeted user locally', async () => {
      setup({ profiles: createQueryMock({ error: null }) });
      service.tenantUsers.set([user('u1'), user('u2')]);
      expect(await service.assignPlanning('u1', 'p1')).toBeNull();
      expect(tables['profiles']['update']).toHaveBeenCalledWith({ assigned_planning_id: 'p1' });
      expect(service.tenantUsers().map(u => u.assigned_planning_id)).toEqual(['p1', null]);
    });

    it('supports unassigning with null', async () => {
      setup({ profiles: createQueryMock({ error: null }) });
      service.tenantUsers.set([{ ...user('u1'), assigned_planning_id: 'p1' }]);
      await service.assignPlanning('u1', null);
      expect(service.tenantUsers()[0].assigned_planning_id).toBeNull();
    });

    it('leaves local state alone on error', async () => {
      setup({ profiles: createQueryMock({ error: { message: 'rls' } }) });
      service.tenantUsers.set([user('u1')]);
      expect(await service.assignPlanning('u1', 'p1')).toBe('rls');
      expect(service.tenantUsers()[0].assigned_planning_id).toBeNull();
    });
  });

  describe('sharing flags', () => {
    it('setShared toggles is_shared_with_gym for one plan', async () => {
      setup({ plannings: createQueryMock({ error: null }) });
      service.plannings.set([plan('a'), plan('b')]);
      expect(await service.setShared('a', true)).toBeNull();
      expect(tables['plannings']['update']).toHaveBeenCalledWith({ is_shared_with_gym: true });
      expect(service.plannings().map(p => p.is_shared_with_gym)).toEqual([true, false]);
    });

    it('setSharedWithFriends toggles is_shared_with_friends for one plan', async () => {
      setup({ plannings: createQueryMock({ error: null }) });
      service.plannings.set([plan('a'), plan('b')]);
      expect(await service.setSharedWithFriends('b', true)).toBeNull();
      expect(tables['plannings']['update']).toHaveBeenCalledWith({ is_shared_with_friends: true });
      expect(service.plannings().map(p => p.is_shared_with_friends)).toEqual([false, true]);
    });

    it('neither flag changes locally when the write fails', async () => {
      setup({ plannings: createQueryMock({ error: { message: 'rls' } }) });
      service.plannings.set([plan('a')]);
      expect(await service.setShared('a', true)).toBe('rls');
      expect(await service.setSharedWithFriends('a', true)).toBe('rls');
      expect(service.plannings()[0].is_shared_with_gym).toBeFalse();
      expect(service.plannings()[0].is_shared_with_friends).toBeFalse();
    });
  });
});
