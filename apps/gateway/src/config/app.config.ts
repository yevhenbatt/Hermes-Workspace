export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'workspace-gateway',
    version: process.env.APP_VERSION ?? '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-this-secret',
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
