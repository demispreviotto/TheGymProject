import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import type { Profile } from '../auth/auth.types';
import type { Exercise } from '../planning/planning.types';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createClientMock, createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { ExercisePayload, ExerciseService } from './exercise.service';

const ex = (id: string) => ({ id, name: id } as Exercise);
const payload: ExercisePayload = { name: 'Squat', definition: null, recommendations: null, muscle_groups: [] };

describe('ExerciseService', () => {
  let service: ExerciseService;
  let exercises: QueryMock;

  const setup = (result: Parameters<typeof createQueryMock>[0]) => {
    exercises = createQueryMock(result);
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: createClientMock({ exercises }) },
        { provide: AuthService, useValue: { profile: signal({ id: 'me' } as Profile) } },
      ],
    });
    service = TestBed.inject(ExerciseService);
  };

  describe('load', () => {
    it('fetches global and own exercises sorted by name', async () => {
      setup({ data: [ex('a'), ex('b')] });
      await service.load();
      expect(exercises['or']).toHaveBeenCalledWith('tenant_id.is.null,tenant_id.eq.me');
      expect(exercises['order']).toHaveBeenCalledWith('name');
      expect(service.exercises().length).toBe(2);
      expect(service.loading()).toBeFalse();
    });

    it('falls back to an empty list', async () => {
      setup({ data: null });
      await service.load();
      expect(service.exercises()).toEqual([]);
    });
  });

  describe('create', () => {
    it('inserts with the owner id and reloads', async () => {
      setup([{ error: null }, { data: [ex('new')] }]);
      expect(await service.create(payload)).toBeNull();
      expect(exercises['insert']).toHaveBeenCalledWith({ ...payload, tenant_id: 'me' });
      expect(service.exercises().map(e => e.id)).toEqual(['new']);
    });

    it('returns the error and does not reload', async () => {
      setup({ error: { message: 'rls' } });
      expect(await service.create(payload)).toBe('rls');
      expect(exercises['select']).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates by id and reloads', async () => {
      setup([{ error: null }, { data: [ex('a')] }]);
      expect(await service.update('a', payload)).toBeNull();
      expect(exercises['update']).toHaveBeenCalledWith(payload);
      expect(exercises['eq']).toHaveBeenCalledWith('id', 'a');
      expect(service.exercises().length).toBe(1);
    });

    it('returns the error and does not reload', async () => {
      setup({ error: { message: 'rls' } });
      expect(await service.update('a', payload)).toBe('rls');
      expect(exercises['select']).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('removes the exercise locally on success', async () => {
      setup({ error: null });
      service.exercises.set([ex('a'), ex('b')]);
      expect(await service.delete('a')).toBeNull();
      expect(service.exercises().map(e => e.id)).toEqual(['b']);
    });

    it('keeps the list on failure (e.g. exercise still used in a plan)', async () => {
      setup({ error: { message: 'fk violation' } });
      service.exercises.set([ex('a')]);
      expect(await service.delete('a')).toBe('fk violation');
      expect(service.exercises().length).toBe(1);
    });
  });
});
