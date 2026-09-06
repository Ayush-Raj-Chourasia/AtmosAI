import { Test, TestingModule } from '@nestjs/testing';
import { UserPlacesController } from './user-places.controller';

describe('UserPlacesController', () => {
  let controller: UserPlacesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserPlacesController],
    }).compile();

    controller = module.get<UserPlacesController>(UserPlacesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
