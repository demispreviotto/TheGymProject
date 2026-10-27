import { inject, Injectable } from '@angular/core';
import { SUPABASE_CLIENT } from '../supabase/supabase.client';

export type InviteableRole = 'trainer' | 'user' | 'free';

export interface InviteOutcome {
  link: string | null;
  error: string | null;
  /** HTTP status of the edge function's answer; null when it could not be reached. */
  status: number | null;
}

/** Edge function failure. supabase-js hides the JSON body behind `context` (the raw Response). */
interface InvokeFailure {
  message: string;
  context?: unknown;
}

const GENERIC_FAILURE = 'Failed to generate invite.';

/** The edge function's `{ error }` message and status, or supabase-js's generic text when there is no body. */
async function readFailure(failure: InvokeFailure): Promise<Pick<InviteOutcome, 'error' | 'status'>> {
  const response = failure.context;
  if (!(response instanceof Response)) return { error: failure.message || GENERIC_FAILURE, status: null };
  try {
    const body = await response.clone().json() as { error?: unknown };
    const message = typeof body.error === 'string' ? body.error : null;
    return { error: message ?? failure.message ?? GENERIC_FAILURE, status: response.status };
  } catch {
    return { error: failure.message || GENERIC_FAILURE, status: response.status };
  }
}

/**
 * Generates invite links through the `invite-client` edge function. Asking for an email that
 * was invited before but never finished registering returns a fresh link (a re-invite).
 */
@Injectable({ providedIn: 'root' })
export class InviteService {
  private readonly supabase = inject(SUPABASE_CLIENT);

  async createLink(email: string, role?: InviteableRole): Promise<InviteOutcome> {
    const { data, error } = await this.supabase.functions.invoke('invite-client', {
      body: role ? { email, role } : { email },
    });
    if (error) return { link: null, ...(await readFailure(error)) };

    const link = (data as { inviteLink?: string } | null)?.inviteLink ?? null;
    return link
      ? { link, error: null, status: 200 }
      : { link: null, error: GENERIC_FAILURE, status: 200 };
  }
}
