export const AUTH_CONSTANTS = {
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-this-secret',
    accessTokenExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
  },
  strategy: {
    jwt: 'jwt',
  },
} as const;
