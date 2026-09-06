import { Controller, Get, Post, Delete, Patch, Body, Query, Param, BadRequestException } from '@nestjs/common';
import { UserPlacesService } from './user-places.service';
import { z } from 'zod';

const placeSchema = z.object({
  user_id: z.string().uuid(),
  label: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  radius_m: z.number().min(100).max(100000).default(3000), // Default 3km, Max 100km
});

const notificationSchema = z.object({
  notify_enabled: z.boolean(),
});

@Controller('user')
export class UserPlacesController {
  constructor(private readonly userPlacesService: UserPlacesService) {}

  @Post('places')
  async create(@Body() body: any) {
    const validated = placeSchema.safeParse(body);

    if (!validated.success) {
      throw new BadRequestException({
        error: 'Invalid Input',
        details: validated.error.issues,
      });
    }

    return this.userPlacesService.createPlace(validated.data);
  }

  @Get('places')
  async findAll(@Query('user_id') userId: string) {
    if (!userId) {
      throw new BadRequestException({ error: 'Missing user_id' });
    }
    return this.userPlacesService.getPlaces(userId);
  }

  @Delete('places/:id')
  async remove(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('Missing ID');
    }
    return this.userPlacesService.deletePlace(id);
  }

  @Patch('places/:id/notifications')
  async updateNotificationPreference(@Param('id') id: string, @Body() body: any) {
    if (!id) {
      throw new BadRequestException('Missing ID');
    }

    const validated = notificationSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestException({
        error: 'Invalid Input',
        details: validated.error.issues,
      });
    }

    return this.userPlacesService.updateNotifyEnabled(id, validated.data.notify_enabled);
  }

  @Get('stats')
  async getStats(@Query('user_id') userId: string) {
    if (!userId) {
      throw new BadRequestException({ error: 'Missing user_id' });
    }
    return this.userPlacesService.getUserStats(userId);
  }
}
