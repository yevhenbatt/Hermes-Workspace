import { Injectable, Optional } from '@nestjs/common';
import { EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { User } from '../models/user.model';

@Injectable()
export class UserRepository {
  private readonly developmentUsers: User[] = [
    new User(
      'admin',
      '$argon2id$v=19$m=65536,p=4,t=3$1v9lEM8IhEEWBJw610r7mg$bVGPNCZw5FntYAUYfIU3D4ekwCfTl1zXhPKC21xPhwg',
    ),
  ];

  constructor(
    @Optional()
    @InjectRepository(User)
    private readonly repository?: EntityRepository<User>,
  ) {}

  async findByUsername(username: string): Promise<User | undefined> {
    if (this.repository) {
      const user = await this.repository.findOne({ username });
      return user ?? undefined;
    }

    return this.developmentUsers.find((user) => user.username === username);
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const user = new User(username, passwordHash);

    if (this.repository) {
      const entityManager = this.repository.getEntityManager();
      await entityManager.persist(user).flush();
      return user;
    }

    this.developmentUsers.push(user);
    return user;
  }
}
