import { Controller, Sse, MessageEvent, Get } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SkipThrottle } from '@nestjs/throttler';
import { SseService } from './sse.service';

@Controller()
@SkipThrottle()
export class SseController {
  constructor(private readonly sseService: SseService) {}

  /**
   * PRD standard endpoint: GET /api/v1/events/stream
   */
  @Sse('api/v1/events/stream')
  streamEvents(): Observable<MessageEvent> {
    return this.sseService.getEvents();
  }

  /**
   * Backward compatible endpoint: GET /sse/events
   */
  @Sse('sse/events')
  legacyEvents(): Observable<MessageEvent> {
    return this.sseService.getEvents();
  }
}
