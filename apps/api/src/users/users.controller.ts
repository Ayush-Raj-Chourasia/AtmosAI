import { Controller, Post, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import type { SyncUserDto } from './users.service';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Sync user data from frontend after login.
   * Called by the frontend after successful Supabase Auth login.
   */
  @Post('sync')
  async syncUser(@Body() body: SyncUserDto) {
    if (!body.id) {
      throw new BadRequestException('User ID is required');
    }

    return this.usersService.syncUser(body);
  }

  /**
   * Get user by ID
   */
  @Get(':id')
  async getUser(@Param('id') id: string) {
    const user = await this.usersService.getUserById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }
}
