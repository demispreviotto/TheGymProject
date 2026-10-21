import { validateInviteRequest, type InviteRequestForm } from './invite-request.validation';

const valid: InviteRequestForm = {
  name: 'Lucía Pérez',
  email: 'lucia@example.com',
  reason: 'my training partner',
  accepted: true,
};

const with_ = (patch: Partial<InviteRequestForm>): InviteRequestForm => ({ ...valid, ...patch });

describe('validateInviteRequest', () => {
  it('is ready (no issue) when everything is filled in, valid and accepted', () => {
    expect(validateInviteRequest(valid)).toBeNull();
  });

  it('reports missing fields for each empty required field', () => {
    expect(validateInviteRequest(with_({ name: '' }))).toBe('missing-fields');
    expect(validateInviteRequest(with_({ email: '' }))).toBe('missing-fields');
    expect(validateInviteRequest(with_({ reason: '' }))).toBe('missing-fields');
  });

  it('treats a field that only holds spaces as empty', () => {
    expect(validateInviteRequest(with_({ name: '   ' }))).toBe('missing-fields');
    expect(validateInviteRequest(with_({ email: ' \t ' }))).toBe('missing-fields');
    expect(validateInviteRequest(with_({ reason: '\n' }))).toBe('missing-fields');
  });

  it('reports an invalid email once the fields are filled in', () => {
    expect(validateInviteRequest(with_({ email: 'not-an-email' }))).toBe('invalid-email');
    expect(validateInviteRequest(with_({ email: 'a@b' }))).toBe('invalid-email');
    expect(validateInviteRequest(with_({ email: 'two words@example.com' }))).toBe('invalid-email');
  });

  it('accepts an email with surrounding spaces, since the form trims it', () => {
    expect(validateInviteRequest(with_({ email: '  lucia@example.com  ' }))).toBeNull();
  });

  it('requires the responsibility box to be ticked', () => {
    expect(validateInviteRequest(with_({ accepted: false }))).toBe('responsibility-not-accepted');
  });

  it('reports issues in the order a person fixes them', () => {
    const empty: InviteRequestForm = { name: '', email: '', reason: '', accepted: false };
    expect(validateInviteRequest(empty)).toBe('missing-fields');
    expect(validateInviteRequest({ ...empty, name: 'A', email: 'bad', reason: 'r' })).toBe('invalid-email');
    expect(validateInviteRequest({ ...empty, name: 'A', email: 'a@b.co', reason: 'r' })).toBe('responsibility-not-accepted');
  });

  it('does not require the responsibility box while fields are still missing', () => {
    // the first issue wins, so an unticked box never hides a more basic problem
    expect(validateInviteRequest(with_({ name: '', accepted: false }))).toBe('missing-fields');
  });
});
