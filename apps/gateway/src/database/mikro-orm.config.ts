import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';

import { UserSchema } from '../modules/users/models/user.model';

export default defineConfig({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  dbName: process.env.DB_NAME ?? 'hermes',
  user: process.env.DB_USER ?? 'gateway',
  password: process.env.DB_PASSWORD,
  entities: [UserSchema],
  extensions: [Migrator],
  migrations: {
    schema: 'auth',
    path: 'dist/src/database/migrations',
    pathTs: 'src/database/migrations',
  },
});
