import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';
import { createClientMock } from '../../testing/supabase-mock';
import { InviteService } from './invite.service';

describe('InviteService', () => {
  let service: InviteService;
  let invoke: Mock;

  beforeEach(() => {
    invoke = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: SUPABASE_CLIENT, useValue: createClientMock({}, { functions: { invoke } }) },
      ],
    });
    service = TestBed.inject(InviteService);
  });

  const failure = (status: number, body: unknown) => ({
    data: null,
    error: {
      message: 'Edge Function returned a non-2xx status code',
      context: new Response(JSON.stringify(body), { status }),
    },
  });

  it('returns the link and sends only the email when no role is given', async () => {
    invoke.mockResolvedValue({ data: { success: true, inviteLink: 'https://app/accept-invite?token_hash=x' }, error: null });

    expect(await service.createLink('a@x.io')).toEqual({
      link: 'https://app/accept-invite?token_hash=x', error: null, status: 200,
    });
    expect(invoke).toHaveBeenCalledWith('invite-client', { body: { email: 'a@x.io' } });
  });

  it('sends the role when one is given', async () => {
    invoke.mockResolvedValue({ data: { inviteLink: 'l' }, error: null });
    await service.createLink('a@x.io', 'trainer');
    expect(invoke).toHaveBeenCalledWith('invite-client', { body: { email: 'a@x.io', role: 'trainer' } });
  });

  it('surfaces the edge function message and status instead of the generic text', async () => {
    invoke.mockResolvedValue(failure(409, { error: 'A user with this email already exists' }));
    expect(await service.createLink('a@x.io')).toEqual({
      link: null, error: 'A user with this email already exists', status: 409,
    });
  });

  it('falls back to the supabase-js message when the body is not JSON', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: { message: 'gateway down', context: new Response('<html>', { status: 502 }) },
    });
    expect(await service.createLink('a@x.io')).toEqual({ link: null, error: 'gateway down', status: 502 });
  });

  it('reports a network failure without a status', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'Failed to send a request to the Edge Function' } });
    expect(await service.createLink('a@x.io')).toEqual({
      link: null, error: 'Failed to send a request to the Edge Function', status: null,
    });
  });

  it('treats a success answer without a link as a failure', async () => {
    invoke.mockResolvedValue({ data: { success: true }, error: null });
    expect((await service.createLink('a@x.io')).link).toBeNull();
  });
});
