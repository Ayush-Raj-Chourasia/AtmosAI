import { Test, TestingModule } from '@nestjs/testing';
import { UserPlacesService } from './user-places.service';

describe('UserPlacesService', () => {
  let service: UserPlacesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserPlacesService],
    }).compile();

    service = module.get<UserPlacesService>(UserPlacesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
