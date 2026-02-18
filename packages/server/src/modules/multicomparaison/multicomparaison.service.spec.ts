import { Test, TestingModule } from '@nestjs/testing';
import { MultiComparaisonService } from './multicomparaison.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ComparaisonService } from '../comparaison/comparaison.service';
import { ApiError } from '../../common/errors/api-error';

describe('MultiComparaisonService', () => {
  let service: MultiComparaisonService;
  let prisma: {
    programme: { findMany: jest.Mock };
    multiComparaison: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    comparaison: {
      update: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
    };
    taskClassification: { findMany: jest.Mock };
    module: { findMany: jest.Mock };
    sousModule: { findMany: jest.Mock };
  };
  let comparaisonService: {
    createComparaison: jest.Mock;
    getEcartByComparaisonId: jest.Mock;
    getAllModulesByComparaisonId: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      programme: { findMany: jest.fn() },
      multiComparaison: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      comparaison: {
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      taskClassification: { findMany: jest.fn() },
      module: { findMany: jest.fn() },
      sousModule: { findMany: jest.fn() },
    };

    comparaisonService = {
      createComparaison: jest.fn(),
      getEcartByComparaisonId: jest.fn(),
      getAllModulesByComparaisonId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MultiComparaisonService,
        { provide: PrismaService, useValue: prisma },
        { provide: ComparaisonService, useValue: comparaisonService },
      ],
    }).compile();

    service = module.get<MultiComparaisonService>(MultiComparaisonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createMultiComparaison should validate programmes and create comparisons', async () => {
    prisma.programme.findMany.mockResolvedValue([{ id: 2 }, { id: 3 }]);
    prisma.multiComparaison.create.mockResolvedValue({ id: 10 });

    comparaisonService.createComparaison
      .mockResolvedValueOnce({ data: { id: 101 } })
      .mockResolvedValueOnce({ data: { comparaisonID: 102 } });

    prisma.comparaison.update.mockResolvedValue(undefined);

    const result = await service.createMultiComparaison({
      idProgrammeToCompare: 1,
      idProgrammeComparedTo: [2, 3],
    });

    expect(prisma.programme.findMany).toHaveBeenCalledWith({
      where: { id: { in: [2, 3] } },
      select: { id: true },
    });
    expect(prisma.multiComparaison.create).toHaveBeenCalled();
    expect(comparaisonService.createComparaison).toHaveBeenCalledTimes(2);
    expect(result.status).toBe('success');
    expect(result.data.totalRequested).toBe(2);
    expect(result.data.totalSuccessful).toBe(2);
  });

  it('createMultiComparaison should throw when some programmes are missing', async () => {
    prisma.programme.findMany.mockResolvedValue([{ id: 2 }]);

    await expect(
      service.createMultiComparaison({
        idProgrammeToCompare: 1,
        idProgrammeComparedTo: [2, 3],
      }),
    ).rejects.toBeInstanceOf(ApiError);
  });

  it('getAllMultiComparaisons should return items with pagination', async () => {
    prisma.multiComparaison.findMany.mockResolvedValue([
      {
        id: 1,
        createdAt: new Date(),
        createdById: 'user',
        totalGaps: 5,
        averageSimilarity: 0.8,
        comparaisons: [
          {
            id: 100,
            idProgrammeToCompare: 1,
            idProgrammeComparedTo: 2,
            tauxDeSimilarite: 0.8,
            nombreEcart: 5,
            createdAt: new Date(),
            createdById: 'user',
            programmeToCompare: {
              id: 1,
              nomProgramme: 'Prog A',
              nomProgrammeEn: 'Prog A EN',
              secteur: null,
              secteurEn: null,
              sousSecteur: null,
              sousSecteurEn: null,
            },
            programmeComparedTo: {
              id: 2,
              nomProgramme: 'Prog B',
              nomProgrammeEn: 'Prog B EN',
              secteur: null,
              secteurEn: null,
              sousSecteur: null,
              sousSecteurEn: null,
            },
          },
        ],
      },
    ]);
    prisma.multiComparaison.count.mockResolvedValue(1);

    const result = await service.getAllMultiComparaisons(1, 10);

    expect(result.status).toBe('success');
    expect(result.data.items).toHaveLength(1);
    expect(result.data.pagination.totalCount).toBe(1);
  });

  it('getGapsByMultiComparaisonId should return paginated gaps', async () => {
    prisma.comparaison.findMany.mockResolvedValue([
      {
        id: 100,
        idProgrammeToCompare: 1,
        idProgrammeComparedTo: 2,
        programmeToCompare: {
          id: 1,
          nomProgramme: 'Prog A',
          nomProgrammeEn: 'Prog A EN',
        },
        programmeComparedTo: {
          id: 2,
          nomProgramme: 'Prog B',
          nomProgrammeEn: 'Prog B EN',
        },
      },
    ]);

    comparaisonService.getEcartByComparaisonId.mockResolvedValue({
      status: 'success',
      code: '200',
      data: [
        {
          module_id: 10,
          nom_module: 'Module 1',
          submodule_id: 20,
          nom_sousmodule: 'Sous-module 1',
          description_sousmodule: null,
          Code_Objectif: 'OBJ1',
          Code_Module: 'M1',
        },
      ],
    });

    prisma.module.findMany.mockResolvedValue([
      {
        id: 10,
        nomModule: 'Module 1',
        nomModuleEn: 'Module 1 EN',
        dureeEnHeures: 40,
        sousModules: [],
      },
    ]);

    prisma.sousModule.findMany.mockResolvedValue([
      {
        id: 20,
        nomSousModule: 'Sous-module 1',
        nomSousModuleEn: 'Sous-module 1 EN',
        codeObjectif: 'OBJ1',
      },
    ]);

    const result = await service.getGapsByMultiComparaisonId(1, 1, 10);

    expect(result.success).toBe(true);
    expect(result.data.ecart).toHaveLength(1);
    expect(result.data.pagination.totalCount).toBe(1);
  });
});
