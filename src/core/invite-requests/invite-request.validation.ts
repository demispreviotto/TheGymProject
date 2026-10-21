import { isValidEmail } from '../../shared/utils/validators';

/** What the "invite a friend" form holds, exactly as typed. */
export interface InviteRequestForm {
  name: string;
  email: string;
  reason: string;
  accepted: boolean;
}

/** The first thing stopping the form from being submitted. */
export type InviteRequestIssue = 'missing-fields' | 'invalid-email' | 'responsibility-not-accepted';

/**
 * Single source of truth for whether an invite request can be sent: the page disables its button
 * while this returns an issue, and checks it again in the click handler. Fields are trimmed, so a
 * field holding only spaces counts as empty. Returns the first issue in the order a person would fix
 * them (fill everything, then a valid email, then accept responsibility), or null when it is ready.
 */
export function validateInviteRequest(form: InviteRequestForm): InviteRequestIssue | null {
  const name = form.name.trim();
  const email = form.email.trim();
  const reason = form.reason.trim();

  if (!name || !email || !reason) return 'missing-fields';
  if (!isValidEmail(email)) return 'invalid-email';
  if (!form.accepted) return 'responsibility-not-accepted';
  return null;
}
