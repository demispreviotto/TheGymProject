import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import type { Profile } from '../auth/auth.types';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createClientMock, createQueryMock, QueryMock } from '../../testing/supabase-mock';
import { Friendship, FriendshipService } from './friendship.service';

const fs = (id: string, requester: string, addressee: string, status: Friendship['status']): Friendship =>
  ({ id, requester_id: requester, addressee_id: addressee, status, created_at: '' });

describe('FriendshipService', () => {
  let service: FriendshipService;
  let tables: Record<string, QueryMock>;

  const setup = (t: Record<string, QueryMock>) => {
    tables = t;
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: createClientMock(tables) },
        { provide: AuthService, useValue: { profile: signal({ id: 'me' } as Profile) } },
      ],
    });
    service = TestBed.inject(FriendshipService);
  };

  describe('computed lists', () => {
    beforeEach(() => {
      setup({});
      service.friendships.set([
        fs('1', 'me', 'a', 'accepted'),
        fs('2', 'b', 'me', 'pending'),
        fs('3', 'me', 'c', 'pending'),
        fs('4', 'd', 'me', 'rejected'),
      ]);
    });

    it('friends contains only accepted friendships', () => {
      expect(service.friends().map(f => f.id)).toEqual(['1']);
    });

    it('pendingReceived contains pending requests addressed to me', () => {
      expect(service.pendingReceived().map(f => f.id)).toEqual(['2']);
    });

    it('pendingSent contains pending requests I made', () => {
      expect(service.pendingSent().map(f => f.id)).toEqual(['3']);
    });
  });

  describe('load', () => {
    it('clears the list when there are no rows and skips the profile lookup', async () => {
      setup({ friendships: createQueryMock({ data: [] }), profiles: createQueryMock() });
      service.friendships.set([fs('x', 'me', 'a', 'pending')]);
      await service.load();
      expect(service.friendships()).toEqual([]);
      expect(tables['profiles']['select']).not.toHaveBeenCalled();
    });

    it('attaches requester and addressee profiles, fetching each id once', async () => {
      setup({
        friendships: createQueryMock({ data: [fs('1', 'me', 'a', 'accepted'), fs('2', 'a', 'me', 'pending')] }),
        profiles: createQueryMock({ data: [
          { id: 'me', name: 'Me', email: 'me@x.io' },
          { id: 'a', name: 'Ann', email: 'ann@x.io' },
        ] }),
      });

      await service.load();

      expect(tables['profiles']['in']).toHaveBeenCalledWith('id', ['me', 'a']);
      const [first, second] = service.friendships();
      expect(first.requester?.name).toBe('Me');
      expect(first.addressee?.name).toBe('Ann');
      expect(second.requester?.name).toBe('Ann');
    });

    it('leaves profile fields undefined when a profile is missing', async () => {
      setup({
        friendships: createQueryMock({ data: [fs('1', 'me', 'ghost', 'pending')] }),
        profiles: createQueryMock({ data: null }),
      });
      await service.load();
      expect(service.friendships()[0].addressee).toBeUndefined();
    });
  });

  describe('sendRequest', () => {
    it('returns the lookup error', async () => {
      setup({ profiles: createQueryMock({ data: null, error: { message: 'db down' } }), friendships: createQueryMock() });
      expect(await service.sendRequest('a@x.io')).toBe('db down');
    });

    it('reports an unknown email', async () => {
      setup({ profiles: createQueryMock({ data: null }), friendships: createQueryMock() });
      expect(await service.sendRequest('nobody@x.io')).toBe('No account found with that email.');
      expect(tables['friendships']['insert']).not.toHaveBeenCalled();
    });

    it('refuses to add yourself', async () => {
      setup({ profiles: createQueryMock({ data: { id: 'me' } }), friendships: createQueryMock() });
      expect(await service.sendRequest('me@x.io')).toBe('You cannot add yourself.');
      expect(tables['friendships']['insert']).not.toHaveBeenCalled();
    });

    it('translates a unique-constraint violation', async () => {
      setup({
        profiles: createQueryMock({ data: { id: 'a' } }),
        friendships: createQueryMock({ error: { message: 'duplicate key violates unique constraint' } }),
      });
      expect(await service.sendRequest('a@x.io')).toBe('Request already sent.');
    });

    it('passes through other insert errors', async () => {
      setup({
        profiles: createQueryMock({ data: { id: 'a' } }),
        friendships: createQueryMock({ error: { message: 'rls' } }),
      });
      expect(await service.sendRequest('a@x.io')).toBe('rls');
    });

    it('inserts the request then reloads the list', async () => {
      setup({
        profiles: createQueryMock([{ data: { id: 'a' } }, { data: [{ id: 'a', name: 'Ann', email: '' }] }]),
        friendships: createQueryMock([{ error: null }, { data: [fs('1', 'me', 'a', 'pending')] }]),
      });

      expect(await service.sendRequest('a@x.io')).toBeNull();

      expect(tables['friendships']['insert']).toHaveBeenCalledWith({ requester_id: 'me', addressee_id: 'a' });
      expect(service.friendships().length).toBe(1);
    });
  });

  describe('status changes', () => {
    beforeEach(() => {
      setup({ friendships: createQueryMock({ error: null }) });
      service.friendships.set([fs('1', 'a', 'me', 'pending'), fs('2', 'b', 'me', 'pending')]);
    });

    it('accept marks only that friendship accepted', async () => {
      await service.accept('1');
      expect(tables['friendships']['update']).toHaveBeenCalledWith({ status: 'accepted' });
      expect(service.friendships().map(f => f.status)).toEqual(['accepted', 'pending']);
    });

    it('reject marks only that friendship rejected', async () => {
      await service.reject('2');
      expect(tables['friendships']['update']).toHaveBeenCalledWith({ status: 'rejected' });
      expect(service.friendships().map(f => f.status)).toEqual(['pending', 'rejected']);
    });

    it('cancel removes the friendship', async () => {
      await service.cancel('1');
      expect(tables['friendships']['delete']).toHaveBeenCalled();
      expect(service.friendships().map(f => f.id)).toEqual(['2']);
    });
  });
});
