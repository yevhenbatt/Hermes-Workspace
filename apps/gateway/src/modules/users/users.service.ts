import { ConflictException, Injectable } from '@nestjs/common';

import { User } from './models/user.model';
import { UserRepository } from './repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}

  findById(id: string): Promise<User | undefined> {
    return this.userRepository.findById(id);
  }

  findByUsername(username: string): Promise<User | undefined> {
    return this.userRepository.findByUsername(username);
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const existingUser = await this.findByUsername(username);
    if (existingUser) throw new ConflictException('Username is already in use');
    try {
      return await this.userRepository.create(username, passwordHash);
    } catch (error) {
      if (this.isUniqueConstraintViolation(error)) throw new ConflictException('Username is already in use');
      throw error;
    }
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
  }
}
