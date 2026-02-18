import { Test, TestingModule } from '@nestjs/testing';
import { ProgrammeService } from './programme.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('ProgrammeService', () => {
  let service: ProgrammeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProgrammeService,
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ProgrammeService>(ProgrammeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

