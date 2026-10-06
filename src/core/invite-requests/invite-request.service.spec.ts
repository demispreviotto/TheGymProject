import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import type { Profile } from '../auth/auth.types';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createClientMock, createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { InviteRequest, InviteRequestService } from './invite-request.service';

const req = (id: string, status: InviteRequest['status'], requester = 'u1'): InviteRequest =>
  ({ id, status, requester_id: requester } as InviteRequest);

describe('InviteRequestService', () => {
  let service: InviteRequestService;
  let tables: Record<string, QueryMock>;
  let invoke: jasmine.Spy;
  const profile = signal<Profile | null>({ id: 'me' } as Profile);

  const setup = (t: Record<string, QueryMock>) => {
    tables = t;
    invoke = jasmine.createSpy('invoke').and.resolveTo({ error: null });
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: createClientMock(tables, { functions: { invoke } }) },
        { provide: AuthService, useValue: { profile } },
      ],
    });
    service = TestBed.inject(InviteRequestService);
  };

  beforeEach(() => {
    profile.set({ id: 'me' } as Profile);
    spyOn(console, 'log'); // loadAllRequests logs debug output
  });

  describe('computed counters', () => {
    beforeEach(() => setup({}));

    it('counts only approved requests', () => {
      service.myRequests.set([req('1', 'approved'), req('2', 'pending'), req('3', 'rejected')]);
      expect(service.approvedCount()).toBe(1);
      expect(service.remainingInvites()).toBe(1);
    });

    it('never reports negative remaining invites', () => {
      service.myRequests.set([req('1', 'approved'), req('2', 'approved'), req('3', 'approved')]);
      expect(service.remainingInvites()).toBe(0);
    });

    it('pendingCount counts pending requests across all users', () => {
      service.allRequests.set([req('1', 'pending'), req('2', 'pending'), req('3', 'approved')]);
      expect(service.pendingCount()).toBe(2);
    });
  });

  describe('loadMyRequests', () => {
    it('queries by the current user and stores rows', async () => {
      setup({ invite_requests: createQueryMock({ data: [req('1', 'pending')] }) });
      await service.loadMyRequests();
      expect(tables['invite_requests']['eq']).toHaveBeenCalledWith('requester_id', 'me');
      expect(service.myRequests().length).toBe(1);
    });
  });

  describe('loadAllRequests', () => {
    it('empties the list without a profile lookup when there are no requests', async () => {
      setup({ invite_requests: createQueryMock({ data: [] }), profiles: createQueryMock() });
      await service.loadAllRequests();
      expect(service.allRequests()).toEqual([]);
      expect(tables['profiles']['select']).not.toHaveBeenCalled();
    });

    it('attaches requester info, deduplicating requester ids', async () => {
      setup({
        invite_requests: createQueryMock({ data: [req('1', 'pending', 'u1'), req('2', 'pending', 'u1'), req('3', 'approved', 'u2')] }),
        profiles: createQueryMock({ data: [{ id: 'u1', name: 'One', email: '1@x.io' }, { id: 'u2', name: 'Two', email: '2@x.io' }] }),
      });
      await service.loadAllRequests();
      expect(tables['profiles']['in']).toHaveBeenCalledWith('id', ['u1', 'u2']);
      expect(service.allRequests().map(r => r.requester?.name)).toEqual(['One', 'One', 'Two']);
    });
  });

  describe('submitRequest', () => {
    it('requires an authenticated user', async () => {
      setup({ invite_requests: createQueryMock() });
      profile.set(null);
      expect(await service.submitRequest('a@x.io', 'Ann', 'friend')).toBe('Not authenticated');
    });

    it('blocks at two pending/approved requests', async () => {
      setup({ invite_requests: createQueryMock() });
      service.myRequests.set([req('1', 'pending'), req('2', 'approved')]);
      expect(await service.submitRequest('a@x.io', 'Ann', 'friend')).toBe('You have reached the maximum of 2 invite requests.');
      expect(tables['invite_requests']['insert']).not.toHaveBeenCalled();
    });

    it('does not count rejected requests against the limit', async () => {
      setup({ invite_requests: createQueryMock({ error: null, data: [] }) });
      service.myRequests.set([req('1', 'rejected'), req('2', 'rejected'), req('3', 'pending')]);
      expect(await service.submitRequest('a@x.io', 'Ann', 'friend')).toBeNull();
    });

    it('inserts with accepted_responsibility and reloads my requests', async () => {
      setup({ invite_requests: createQueryMock([{ error: null }, { data: [req('9', 'pending')] }]) });
      expect(await service.submitRequest('a@x.io', 'Ann', 'my friend')).toBeNull();
      expect(tables['invite_requests']['insert']).toHaveBeenCalledWith({
        requester_id: 'me', invitee_email: 'a@x.io', invitee_name: 'Ann',
        reason: 'my friend', accepted_responsibility: true,
      });
      expect(service.myRequests().map(r => r.id)).toEqual(['9']);
    });

    it('returns the insert error without reloading', async () => {
      setup({ invite_requests: createQueryMock({ error: { message: 'rls' } }) });
      expect(await service.submitRequest('a@x.io', 'Ann', 'x')).toBe('rls');
      expect(tables['invite_requests']['select']).not.toHaveBeenCalled();
    });
  });

  describe('approveRequest', () => {
    it('invites the user as free via the edge function, then marks the request approved', async () => {
      setup({ invite_requests: createQueryMock([{ error: null }, { data: [] }]) });
      expect(await service.approveRequest('r1', 'a@x.io')).toBeNull();

      expect(invoke).toHaveBeenCalledWith('invite-client', { body: { email: 'a@x.io', role: 'free' } });
      const patch = tables['invite_requests']['update'].calls.mostRecent().args[0];
      expect(patch.status).toBe('approved');
      expect(patch.reviewer_id).toBe('me');
      expect(Date.parse(patch.reviewed_at)).not.toBeNaN();
      expect(tables['invite_requests']['eq']).toHaveBeenCalledWith('id', 'r1');
    });

    it('does not update the request when the invite email fails', async () => {
      setup({ invite_requests: createQueryMock() });
      invoke.and.resolveTo({ error: { message: 'smtp down' } });
      expect(await service.approveRequest('r1', 'a@x.io')).toBe('smtp down');
      expect(tables['invite_requests']['update']).not.toHaveBeenCalled();
    });

    it('returns the update error', async () => {
      setup({ invite_requests: createQueryMock({ error: { message: 'rls' } }) });
      expect(await service.approveRequest('r1', 'a@x.io')).toBe('rls');
    });
  });

  describe('rejectRequest', () => {
    it('stores the reviewer note', async () => {
      setup({ invite_requests: createQueryMock([{ error: null }, { data: [] }]) });
      expect(await service.rejectRequest('r1', 'not now')).toBeNull();
      const patch = tables['invite_requests']['update'].calls.mostRecent().args[0];
      expect(patch).toEqual(jasmine.objectContaining({ status: 'rejected', reviewer_id: 'me', reviewer_note: 'not now' }));
    });

    it('stores a null note when none is given', async () => {
      setup({ invite_requests: createQueryMock([{ error: null }, { data: [] }]) });
      await service.rejectRequest('r1');
      expect(tables['invite_requests']['update'].calls.mostRecent().args[0].reviewer_note).toBeNull();
    });

    it('returns the update error', async () => {
      setup({ invite_requests: createQueryMock({ error: { message: 'rls' } }) });
      expect(await service.rejectRequest('r1')).toBe('rls');
    });
  });
});
