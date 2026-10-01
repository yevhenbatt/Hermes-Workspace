import {
  canUseProviderConnection,
  isGrantActive,
} from './provider-connection.policy';

describe('provider connection policy', () => {
  const now = new Date('2026-10-01T12:00:00.000Z');

  it('accepts a non-expiring active grant', () => {
    expect(isGrantActive('active', null, now)).toBe(true);
  });

  it('rejects an expired grant', () => {
    expect(
      isGrantActive('active', new Date('2026-10-01T11:59:59.000Z'), now),
    ).toBe(false);
  });

  it('requires both an active connection and an active grant', () => {
    expect(canUseProviderConnection('active', true)).toBe(true);
    expect(canUseProviderConnection('pending', true)).toBe(false);
    expect(canUseProviderConnection('active', false)).toBe(false);
  });
});
