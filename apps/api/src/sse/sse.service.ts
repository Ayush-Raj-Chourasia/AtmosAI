import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import { MessageEvent } from '@nestjs/common';

@Injectable()
export class SseService {
  private events$ = new Subject<MessageEvent>();

  addEvent(event: MessageEvent) {
    this.events$.next(event);
  }

  getEvents() {
    return this.events$.asObservable();
  }
}
