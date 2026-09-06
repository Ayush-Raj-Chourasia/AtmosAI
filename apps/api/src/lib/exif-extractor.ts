import * as exifr from 'exifr';
import * as ffmpeg from 'fluent-ffmpeg';
import { path as ffprobePath } from '@ffprobe-installer/ffprobe';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('ExifExtractor');

// Configure ffprobe path
ffmpeg.setFfprobePath(ffprobePath);

export interface MediaMetadata {
  // GPS data
  latitude?: number;
  longitude?: number;
  altitude?: number;
  // Time data
  dateTimeOriginal?: string;
  createDate?: string;
  modifyDate?: string;
  duration?: number; // Video duration in seconds
  // Device data
  make?: string;
  model?: string;
  software?: string;
  // Media data
  width?: number;
  height?: number;
  orientation?: number;
  mimeType?: string;
}

/**
 * Extract metadata from media (image or video)
 * Supports Buffer (for uploaded files) or string (URL/path)
 */
export async function extractMediaMetadata(input: Buffer | string): Promise<MediaMetadata | null> {
  try {
    // Quick check for video-likeness if string URL
    const isVideoUrl = typeof input === 'string' && (input.match(/\.(mp4|mov|avi|mkv|webm)$/i) || input.includes('video'));

    // If it looks like a video, or if we want to try generic media extraction via ffprobe first?
    // Usually exifr is faster/better for images (raw exif tags), while ffprobe is better for A/V container info.

    if (isVideoUrl) {
      return await extractVideoWithFfprobe(input);
    }

    // Default to exifr for images
    try {
      const data = await exifr.parse(input, {
        gps: true,
        pick: [
          'latitude', 'longitude', 'GPSAltitude',
          'DateTimeOriginal', 'CreateDate', 'ModifyDate',
          'Make', 'Model', 'Software', 'AndroidModel', 'AppleModel',
          'ImageWidth', 'ImageHeight', 'ExifImageWidth', 'ExifImageHeight', 'Orientation',
          'MIMEType'
        ],
        translateValues: true,
        translateKeys: true,
      });

      if (data) {
        return mapExifrResult(data);
      }
    } catch (e) {
      // If exifr failed, maybe it's a video it couldn't handle (e.g. buffer input)?
      try {
        return await extractVideoWithFfprobe(input);
      } catch (videoErr) {
        // Both failed
      }
    }

    return null;
  } catch (error) {
    logger.warn(`Failed to extract media metadata: ${error.message}`);
    return null;
  }
}

/**
 * @deprecated Use extractMediaMetadata instead
 */
export const extractExifData = extractMediaMetadata; // Backward compatibility alias

/**
 * Check if EXIF GPS location is significantly different from user's reported location
 */
export function isLocationMismatch(
  exifLat: number,
  exifLng: number,
  userLat: number,
  userLng: number,
  thresholdKm = 10
): boolean {
  const distance = getDistanceKm(exifLat, exifLng, userLat, userLng);
  return distance > thresholdKm;
}

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export function isRecentTimestamp(exifTimestamp: string, maxAgeHours = 24): boolean {
  try {
    const exifDate = new Date(exifTimestamp);
    const now = new Date();
    const diffHours = (now.getTime() - exifDate.getTime()) / (1000 * 60 * 60);
    return diffHours <= maxAgeHours && diffHours >= 0;
  } catch {
    return false;
  }
}

async function extractVideoWithFfprobe(input: Buffer | string): Promise<MediaMetadata | null> {
  let tempFilePath: string | null = null;

  try {
    let inputPath = '';

    if (Buffer.isBuffer(input)) {
      // Write buffer to temp file
      const tempDir = os.tmpdir();
      tempFilePath = path.join(tempDir, `upload-${uuidv4()}.tmp`); // Extension might matter for some containers, but usually ffprobe detects. 
      // Better to try to guess ext or just use .tmp. Ffprobe usually probes content.
      await fs.writeFile(tempFilePath, input);
      inputPath = tempFilePath;
    } else {
      inputPath = input;
    }

    const metadata = await new Promise<any>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata);
      });
    });

    if (!metadata) return null;

    // Map ffprobe output
    const mapped: MediaMetadata = {};
    const format = metadata.format || {};
    // Find first video stream
    const videoStream = (metadata.streams || []).find((s: any) => s.codec_type === 'video');

    // Duration
    if (format.duration) mapped.duration = parseFloat(format.duration);

    // Dimensions
    if (videoStream) {
      if (videoStream.width) mapped.width = videoStream.width;
      if (videoStream.height) mapped.height = videoStream.height;
    }

    // Type
    if (format.format_name) mapped.mimeType = `video/${format.format_name.split(',')[0]}`;

    // GPS & Date - often in tags
    const tags = { ...(format.tags || {}), ...(videoStream?.tags || {}) };

    if (tags.creation_time) mapped.createDate = tags.creation_time;
    // Ffprobe generic date tag?
    if (tags.date) mapped.dateTimeOriginal = tags.date;

    // GPS
    // Common location tags: 'location', 'location-eng', 'com.apple.quicktime.location.ISO6709'
    const locationStr = tags.location || tags['location-eng'] || tags['com.apple.quicktime.location.ISO6709'];
    if (locationStr) {
      const coords = parseIso6709(locationStr);
      if (coords) {
        mapped.latitude = coords.lat;
        mapped.longitude = coords.lng;
      }
    }

    // Device
    if (tags.make || tags['com.apple.quicktime.make']) mapped.make = tags.make || tags['com.apple.quicktime.make'];
    if (tags.model || tags['com.apple.quicktime.model']) mapped.model = tags.model || tags['com.apple.quicktime.model'];
    if (tags.encoder) mapped.software = tags.encoder;

    // Android/other specific tags might vary, but this covers standard QuickTime/MP4 keys + generic ffmpeg keys

    logger.debug(`Video Metadata extracted via Ffprobe: Duration=${mapped.duration}, GPS=${mapped.latitude ? 'YES' : 'no'}`);

    return mapped;

  } catch (err) {
    logger.warn(`Ffprobe extraction failed: ${err.message}`);
    return null;
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await fs.unlink(tempFilePath);
      } catch (e) { /* ignore */ }
    }
  }
}

function mapExifrResult(data: any): MediaMetadata {
  const result: MediaMetadata = {};

  if (data.latitude !== undefined) result.latitude = data.latitude;
  if (data.longitude !== undefined) result.longitude = data.longitude;
  if (data.GPSAltitude !== undefined) result.altitude = data.GPSAltitude;

  const parseDate = (d: any) => d instanceof Date ? d.toISOString() : (d ? String(d) : undefined);

  if (data.DateTimeOriginal) result.dateTimeOriginal = parseDate(data.DateTimeOriginal);
  if (data.CreateDate) result.createDate = parseDate(data.CreateDate);
  if (data.ModifyDate) result.modifyDate = parseDate(data.ModifyDate);

  if (data.Make) result.make = String(data.Make);
  if (data.Model) result.model = String(data.Model);
  else if (data.AndroidModel) result.model = String(data.AndroidModel);
  else if (data.AppleModel) result.model = String(data.AppleModel);

  if (data.Software) result.software = String(data.Software);

  result.width = data.ImageWidth || data.ExifImageWidth;
  result.height = data.ImageHeight || data.ExifImageHeight;

  if (data.Orientation) result.orientation = data.Orientation;
  if (data.MIMEType) result.mimeType = data.MIMEType;

  return result;
}

function parseIso6709(loc: string): { lat: number, lng: number } | null {
  try {
    // Matches +27.5916+086.5640 or +27.5916+086.5640/
    const match = loc.match(/([+-]\d+(\.\d+)?)([+-]\d+(\.\d+)?)/);
    if (match) {
      return {
        lat: parseFloat(match[1]),
        lng: parseFloat(match[3])
      };
    }
    return null;
  } catch {
    return null;
  }
}
