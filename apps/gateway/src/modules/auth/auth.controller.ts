import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('invites')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Create a one-time platform invitation' })
  @ApiCreatedResponse({ description: 'Copy the returned token and send it only to the intended user.' })
  @ApiForbiddenResponse({ description: 'Platform administrator access is required.' })
  createInvite(@Req() req: any, @Body() dto: CreateInviteDto) {
    return this.authService.createInvite(req.user.userId, dto);
  }

  @Post('register')
  @Version('1')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a human Workspace Gateway account and returns an access token.',
  })
  @ApiCreatedResponse({
    description: 'User registration successful.',
    type: LoginResponseDto,
  })
  @ApiConflictResponse({ description: 'Username is already in use.' })
  async register(@Body() registerDto: RegisterDto): Promise<LoginResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Version('1')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates a user and returns an access token.',
  })
  @ApiOkResponse({
    description: 'Authentication successful.',
    type: LoginResponseDto,
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Current user profile',
    description: 'Returns information about the authenticated user.',
  })
  @ApiOkResponse({
    description: 'Authenticated user information returned successfully.',
  })
  getProfile(@Req() req: any) {
    return req.user;
  }
}
