export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'workspace-gateway',
    version: process.env.APP_VERSION ?? '0.1.0',
    environment: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },
});
