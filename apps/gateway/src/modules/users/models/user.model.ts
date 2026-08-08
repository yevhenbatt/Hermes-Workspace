import { randomUUID } from 'node:crypto';

import { EntitySchema } from '@mikro-orm/core';

export class User {
  id = randomUUID();
  username!: string;
  passwordHash!: string;
  isActive = true;
  createdAt = new Date();
  updatedAt = new Date();

  constructor(username: string, passwordHash: string) {
    this.username = username;
    this.passwordHash = passwordHash;
  }
}

export const UserSchema = new EntitySchema<User>({
  class: User,
  schema: 'auth',
  tableName: 'users',
  properties: {
    id: { type: 'uuid', primary: true },
    username: { type: 'string', length: 64, unique: true },
    passwordHash: { type: 'string', fieldName: 'password_hash', length: 255, hidden: true },
    isActive: { type: 'boolean', fieldName: 'is_active', default: true },
    createdAt: { type: 'Date', fieldName: 'created_at', onCreate: () => new Date() },
    updatedAt: {
      type: 'Date',
      fieldName: 'updated_at',
      onCreate: () => new Date(),
      onUpdate: () => new Date(),
    },
  },
});
