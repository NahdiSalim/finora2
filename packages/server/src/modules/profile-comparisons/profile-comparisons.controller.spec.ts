import { Test, TestingModule } from '@nestjs/testing';
import { ProfileComparisonsController } from './profile-comparisons.controller';
import { ProfileComparisonsService } from './profile-comparisons.service';

describe('ProfileComparisonsController', () => {
  let controller: ProfileComparisonsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileComparisonsController],
      providers: [ProfileComparisonsService],
    }).compile();

    controller = module.get<ProfileComparisonsController>(ProfileComparisonsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
