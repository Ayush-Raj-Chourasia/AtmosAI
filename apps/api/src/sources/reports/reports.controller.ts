import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ReportsService } from './reports.service';
import { R2UploadService } from '../../upload/r2-upload.service';

export interface CreateReportBody {
  user_id: string;
  lat: string | number;
  lng: string | number;
  event_type: string;
  description: string;
  confidence?: 'direct_observation' | 'uncertain' | 'hearsay';
}

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly r2UploadService: R2UploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('media', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
    }),
  )
  async createReport(
    @Body() body: CreateReportBody,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Validation
    if (!body.user_id) {
      throw new BadRequestException('user_id is required');
    }
    if (!body.lat || !body.lng) {
      throw new BadRequestException('Location (lat, lng) is required');
    }
    if (!body.event_type) {
      throw new BadRequestException('event_type is required');
    }
    if (!body.description) {
      throw new BadRequestException('description is required');
    }

    // Parse lat/lng as numbers (they come as strings from form-data)
    const lat = typeof body.lat === 'string' ? parseFloat(body.lat) : body.lat;
    const lng = typeof body.lng === 'string' ? parseFloat(body.lng) : body.lng;

    if (isNaN(lat) || isNaN(lng)) {
      throw new BadRequestException('Invalid lat/lng values');
    }

    // Handle file upload if present
    let mediaUrl: string | undefined;
    let mediaType: 'image' | 'video' | undefined;

    if (!file) {
      throw new BadRequestException('Evidence (photo/video) is required');
    }

    if (file) {
      // Validate media type
      const typeValidation = this.r2UploadService.validateMediaType(file);
      if (!typeValidation.valid) {
        throw new BadRequestException(typeValidation.error);
      }
      mediaType = typeValidation.type!;

      // Validate file size (10MB for images, 50MB for videos)
      const maxSize = mediaType === 'image' ? 10 : 50;
      const sizeValidation = this.r2UploadService.validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        throw new BadRequestException(sizeValidation.error);
      }

      // Upload to R2
      const uploadResult = await this.r2UploadService.uploadFile(file, 'reports');
      mediaUrl = uploadResult.url;
    }

    return this.reportsService.createReport({
      user_id: body.user_id,
      lat,
      lng,
      event_type: body.event_type,
      description: body.description,
      confidence: body.confidence,
      media_url: mediaUrl,
      media_type: mediaType,
      media_buffer: file?.buffer, // Pass buffer for EXIF extraction
    });
  }

  @Get('user/:userId')
  async getUserReports(@Param('userId') userId: string) {
    return this.reportsService.getReportsByUser(userId);
  }
}
