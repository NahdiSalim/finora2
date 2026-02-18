import { Test, TestingModule } from '@nestjs/testing';
import { ProfileComparisonsService } from './profile-comparisons.service';

describe('ProfileComparisonsService', () => {
  let service: ProfileComparisonsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProfileComparisonsService],
    }).compile();

    service = module.get<ProfileComparisonsService>(ProfileComparisonsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
