export type ProviderConnectionStatus = 'pending' | 'active' | 'revoked';

export const isGrantActive = (
  status: string,
  expiresAt: Date | null,
  now: Date,
): boolean => {
  return (
    status === 'active' && (!expiresAt || expiresAt.getTime() > now.getTime())
  );
};

export const canUseProviderConnection = (
  status: ProviderConnectionStatus,
  grantActive: boolean,
): boolean => status === 'active' && grantActive;
