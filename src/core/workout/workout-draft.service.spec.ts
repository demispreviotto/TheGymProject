import { TestBed } from '@angular/core/testing';
import { createRow } from './workout-stats';
import { DRAFT_MAX_AGE_MS, draftKey, toDraft } from './workout-draft';
import { WorkoutDraftService } from './workout-draft.service';

const NOW = 1_800_000_000_000;
const KEY = draftKey('u1', 'p1', 1);

const sampleDraft = (savedAt = NOW) => toDraft([
  {
    ...createRow({
      id: 'a', planning_day_id: 'd', exercise_id: 'e', exigence: 'A', rest_time_minutes: 2,
      tracking_mode: 'standard', rounds: 3, target_reps: 8, suggested_first_weight: 60, sorting_order: 1, exercise: null,
    }, 60),
    roundsDone: [true, false, false],
  },
], NOW - 1000, savedAt);

describe('WorkoutDraftService', () => {
  let service: WorkoutDraftService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(WorkoutDraftService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('loads nothing before anything was saved', () => {
    expect(service.load(KEY, NOW)).toBeNull();
  });

  it('saves and loads a draft', () => {
    service.save(KEY, sampleDraft());
    expect(service.load(KEY, NOW)).toEqual(sampleDraft());
  });

  it('keeps drafts of different days and plans apart', () => {
    service.save(KEY, sampleDraft());
    expect(service.load(draftKey('u1', 'p1', 2), NOW)).toBeNull();
    expect(service.load(draftKey('u1', 'p2', 1), NOW)).toBeNull();
    expect(service.load(draftKey('u2', 'p1', 1), NOW)).toBeNull();
  });

  it('clear removes the draft', () => {
    service.save(KEY, sampleDraft());
    service.clear(KEY);
    expect(service.load(KEY, NOW)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('drops and removes a stale draft when loading it', () => {
    service.save(KEY, sampleDraft(NOW - DRAFT_MAX_AGE_MS - 1000));
    expect(service.load(KEY, NOW)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('treats a corrupt entry as no draft', () => {
    localStorage.setItem(KEY, '{broken');
    expect(service.load(KEY, NOW)).toBeNull();
  });

  describe('pruneStale', () => {
    it('removes stale and corrupt drafts but keeps fresh ones and unrelated keys', () => {
      const fresh = draftKey('u1', 'p1', 1);
      const stale = draftKey('u1', 'p1', 2);
      const corrupt = draftKey('u1', 'p1', 3);
      service.save(fresh, sampleDraft());
      service.save(stale, sampleDraft(NOW - DRAFT_MAX_AGE_MS - 1000));
      localStorage.setItem(corrupt, 'nope');
      localStorage.setItem('theme', 'dark');

      service.pruneStale(NOW);

      expect(localStorage.getItem(fresh)).not.toBeNull();
      expect(localStorage.getItem(stale)).toBeNull();
      expect(localStorage.getItem(corrupt)).toBeNull();
      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('when storage fails', () => {
    it('save swallows a quota error', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
      expect(() => service.save(KEY, sampleDraft())).not.toThrow();
    });

    it('load and clear survive a storage that throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
      vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
      expect(service.load(KEY, NOW)).toBeNull();
      expect(() => service.clear(KEY)).not.toThrow();
    });
  });
});
