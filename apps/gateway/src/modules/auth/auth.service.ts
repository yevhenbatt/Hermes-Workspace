import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { PasswordService } from '../../common/security/password/password.service';
import { User } from '../users/models/user.model';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByUsername(loginDto.username);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.passwordHash,
      loginDto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return this.createLoginResponse(user);
  }

  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    const passwordHash = await this.passwordService.hash(registerDto.password);
    const user = await this.usersService.create(registerDto.username, passwordHash);

    return this.createLoginResponse(user);
  }

  private createLoginResponse(user: User): LoginResponseDto {
    return {
      accessToken: this.jwtService.sign({ sub: user.id, username: user.username }),
      refreshToken: 'dummy-refresh-token',
      expiresIn: 3600,
    };
  }
}
