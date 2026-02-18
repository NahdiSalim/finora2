import { Test, TestingModule } from '@nestjs/testing';
import { ComparaisonService } from './comparaison.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('ComparaisonService', () => {
  let service: ComparaisonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<ComparaisonService>(ComparaisonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should export comparaisons to CSV', async () => {
    const mockPrisma = {
      comparaison: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            tauxDeSimilarite: 0.85,
            createdAt: new Date('2024-01-01'),
            programmeToCompare: {
              nomProgramme: 'Programme FR',
              nomProgrammeEn: 'Programme EN',
              secteur: 'Secteur FR',
              secteurEn: 'Secteur EN',
            },
            programmeComparedTo: {
              nomProgramme: 'Another Programme FR',
              nomProgrammeEn: 'Another Programme EN',
              secteur: 'Secteur FR',
              secteurEn: 'Secteur EN',
            },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const result = await testService.exportComparaisonsToCSV('fr', 0, 100);

    expect(result.csv).toBeDefined();
    expect(result.filename).toContain('comparaisons_export_fr');
    expect(result.filename).toContain('.csv');
    expect(result.csv).toContain('Référence');
    expect(result.csv).toContain('Another Programme FR');
  });

  it('should not fallback to FR when EN is selected and EN field is missing', async () => {
    const mockPrisma = {
      comparaison: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            tauxDeSimilarite: 0.85,
            createdAt: new Date('2024-01-01'),
            programmeToCompare: {
              nomProgramme: 'Programme FR',
              nomProgrammeEn: null, // EN field is null
              secteur: 'Secteur FR',
              secteurEn: null,
            },
            programmeComparedTo: {
              nomProgramme: 'Another Programme FR',
              nomProgrammeEn: null, // EN field is null
              secteur: 'Secteur FR',
              secteurEn: null,
            },
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const result = await testService.exportComparaisonsToCSV('en', 0, 100);

    expect(result.csv).toBeDefined();
    expect(result.csv).toContain('Reference');
    expect(result.csv).toContain('Comparable Program');
    // Should be empty strings, not fallback to FR
    expect(result.csv).not.toContain('Another Programme FR');
    expect(result.csv).not.toContain('Programme FR');
    // Check that CSV rows have empty values for programme fields
    const rows = result.csv.split('\n');
    const dataRow = rows[1]; // Skip header row
    expect(dataRow).toContain(',,'); // Empty values for programme fields
  });

  it('should get all classification list', async () => {
    const mockPrisma = {
      comparaison: {
        findUnique: jest.fn().mockResolvedValue({
          id: 55,
          idProgrammeToCompare: 1,
        }),
      },
      taskClassification: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            taskClass: 'soft skills',
            taskDescription: 'Task Description',
            taskDescriptionEn: 'Task Description EN',
            taskModule: 'Module Name',
            taskModuleEn: 'Module Name EN',
          },
          {
            id: 2,
            taskClass: 'technical skills',
            taskDescription: 'Tech Task',
            taskDescriptionEn: 'Tech Task EN',
            taskModule: 'Tech Module',
            taskModuleEn: 'Tech Module EN',
          },
          {
            id: 3,
            taskClass: 'Unknown Class',
            taskDescription: 'Unknown Task',
            taskDescriptionEn: 'Unknown Task EN',
            taskModule: 'Unknown Module',
            taskModuleEn: 'Unknown Module EN',
          },
        ]),
      },
      module: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            nomModule: 'Module Name',
            codeModule: 'M1',
          },
          {
            id: 2,
            nomModule: 'Tech Module',
            codeModule: 'M2',
          },
        ]),
      },
      sousModule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            idModule: 1,
            nomSousModule: 'Task Description',
            codeObjectif: 'O1',
          },
          {
            id: 2,
            idModule: 2,
            nomSousModule: 'Tech Task',
            codeObjectif: 'O2',
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const result = await testService.getAllClassificationList(55);

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(result.data['soft skills']).toHaveLength(1);
    expect(result.data['soft skills'][0].task_id).toBe(1);
    expect(result.data['soft skills'][0].code_module).toBe('M1');
    expect(result.data['soft skills'][0].code_objectif).toBe('O1');
    expect(result.data['technical skills']).toHaveLength(1);
    expect(result.data['technical skills'][0].task_id).toBe(2);
    expect(result.data['technical skills'][0].code_module).toBe('M2');
    expect(result.data['technical skills'][0].code_objectif).toBe('O2');
    expect(result.data.unrecognized).toHaveLength(1);
    expect(result.data.unrecognized[0]).not.toHaveProperty('task_id');
  });

  it('should throw error if comparaison not found', async () => {
    const mockPrisma = {
      comparaison: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    await expect(testService.getAllClassificationList(999)).rejects.toThrow();
  });

  it('should throw error if comparaison_id is not provided', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    await expect(testService.getAllClassificationList(0)).rejects.toThrow();
    await expect(
      testService.getAllClassificationList(undefined as unknown as number),
    ).rejects.toThrow();
  });

  it('should export comparaison matrices to CSV', async () => {
    const mockPrisma = {
      comparaison: {
        findUnique: jest.fn().mockResolvedValue({
          id: 55,
          idProgrammeToCompare: 1,
          idProgrammeComparedTo: 2,
          tauxDeSimilarite: 0.85,
          programmeToCompare: {
            nomProgramme: 'Programme FR',
            nomProgrammeEn: 'Programme EN',
          },
          programmeComparedTo: {
            nomProgramme: 'Another Programme FR',
            nomProgrammeEn: 'Another Programme EN',
          },
        }),
      },
      module: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            {
              nomModule: 'Module TN FR',
              nomModuleEn: 'Module TN EN',
              dureeEnHeures: '80',
            },
          ])
          .mockResolvedValueOnce([
            {
              id: 1,
              nomModule: 'Module AL FR',
              nomModuleEn: 'Module AL EN',
              dureeEnHeures: '60',
              codeModule: 'M1',
            },
          ]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      sousModule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      sousModuleSimilarite: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    // Mock getAllModulesByComparaisonId to return test data
    jest.spyOn(testService, 'getAllModulesByComparaisonId').mockResolvedValue({
      status: 'success',
      code: '200',
      data: {
        comparaisonID: 55,
        id_Programme_Compare: 1,
        Nom_Programme_Comapare: 'Programme FR',
        Nom_Programme_Comapare_en: 'Programme EN',
        id_Programme_Comparable: 2,
        Nom_Programme_Comparable: 'Another Programme FR',
        Nom_Programme_Comparable_en: 'Another Programme EN',
        TauxSimilarité: '0.85',
        modulesTn: ['Module TN FR,80'],
        modulesTn_en: ['Module TN EN,80'],
        modulesAl: [[1, 'Module AL FR,M1,60', 'Module AL EN,M1,60', [], []]],
      },
    });

    const result = await testService.exportComparaisonCsvById(55, 'fr');

    expect(result.csv).toBeDefined();
    // Filename format now "Comparaison_entre_<A>_et_<B>_<YYYY-MM-DD>.csv"
    expect(result.filename).toContain(
      'Comparaison_entre_Programme_FR_et_Another_Programme_FR',
    );
    expect(result.filename).toContain('.csv');
    expect(result.csv).toContain('Nombre de modules');
    expect(result.csv).toContain('Heures');
    expect(result.csv).toContain('Taux de similarité');
  });

  it('should get pre-comparaison', async () => {
    const mockPrisma = {
      programme: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1294,
          nomProgramme: 'Programme Name',
        }),
      },
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        similarProgrammes: [],
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const result = await testService.getPreComparaison(1294);

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(mockPrisma.programme.findUnique).toHaveBeenCalledWith({
      where: { id: 1294 },
      select: { id: true, nomProgramme: true },
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/pre-comparaison',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          API_KEY: 'test-api-key',
        }),
        body: JSON.stringify({
          programName: 'Programme Name',
          model: 'camembert',
          searchIN: 'Tunisien',
          n: 13,
        }),
      }),
    );
  });

  it('should throw error if programme not found', async () => {
    const mockPrisma = {
      programme: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    await expect(testService.getPreComparaison(999)).rejects.toThrow();
  });

  it('should throw error if programme_id is not provided', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    await expect(testService.getPreComparaison(0)).rejects.toThrow();
    await expect(
      testService.getPreComparaison(undefined as unknown as number),
    ).rejects.toThrow();
  });

  it('should call ecarts classification API', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        classification: [],
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {
            comparaison: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            module: {
              findMany: jest.fn(),
            },
            sousModule: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      comparaison_id: 55,
      tasks: [
        {
          module: 'Module Name',
          ecart: 'Sous Module Name',
        },
      ],
    };
    const result = await testService.ecartsClassification(body, 'fr');

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/classification?lang=fr',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          API_KEY: 'test-api-key',
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it('should call ecarts classification API with en language', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        classification: [],
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {
            comparaison: {
              findUnique: jest.fn().mockResolvedValue(null),
            },
            module: {
              findMany: jest.fn(),
            },
            sousModule: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      comparaison_id: 55,
      tasks: [],
    };
    const result = await testService.ecartsClassification(body, 'en');

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/classification?lang=en',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          API_KEY: 'test-api-key',
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it('should throw error if ecarts classification API fails', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ msg: 'Invalid request' })),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      comparaison_id: 55,
      tasks: [],
    };

    await expect(
      testService.ecartsClassification(body, 'fr'),
    ).rejects.toThrow();
  });

  it('should call ecarts classification update API', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      task_id: 1,
      task_class: 'soft skills',
    };
    const result = await testService.ecartsClassificationUpdate(body);

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/update-classification',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          API_KEY: 'test-api-key',
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it('should throw error if ecarts classification update API fails', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ msg: 'Invalid request' })),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      task_id: 1,
      task_class: 'soft skills',
    };

    await expect(
      testService.ecartsClassificationUpdate(body),
    ).rejects.toThrow();
  });

  it('should call remove similarity API', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        msg: 'Similarity removed successfully',
      }),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      similarity_id: 1,
      comparaison_id: 55,
    };
    const result = await testService.removeSimilarity(body);

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/remove-similarity',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          API_KEY: 'test-api-key',
        }),
        body: JSON.stringify(body),
      }),
    );
  });

  it('should throw error if remove similarity API fails', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: jest
        .fn()
        .mockResolvedValue(JSON.stringify({ msg: 'Invalid request' })),
    });

    global.fetch = mockFetch as unknown as typeof fetch;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BACK_URL_COMPARAISON')
                return 'http://localhost:8000';
              if (key === 'API_KEY') return 'test-api-key';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const body = {
      similarity_id: 1,
      comparaison_id: 55,
    };

    await expect(testService.removeSimilarity(body)).rejects.toThrow();
  });

  it('should get all programme modules', async () => {
    const mockPrisma = {
      programme: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          modules: [
            {
              id: 1,
              sousModules: [
                {
                  id: 1,
                  nomSousModule: 'Sous Module 1',
                  nomSousModuleEn: 'Sous Module 1 EN',
                },
                {
                  id: 2,
                  nomSousModule: 'Sous Module 2',
                  nomSousModuleEn: 'Sous Module 2 EN',
                },
              ],
            },
            {
              id: 2,
              sousModules: [
                {
                  id: 3,
                  nomSousModule: 'Sous Module 3',
                  nomSousModuleEn: 'Sous Module 3 EN',
                },
              ],
            },
          ],
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const result = await testService.getAllProgrammeModules(1, 1, 10);

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(result.data).toHaveLength(3);
    expect(result.data[0]).toEqual({
      id: 1,
      name: 'Sous Module 1',
      nameEn: 'Sous Module 1 EN',
    });
    expect(result.pagination.totalCount).toBe(3);
    expect(result.pagination.currentPage).toBe(1);
  });

  it('should get all programme modules with pagination', async () => {
    const mockPrisma = {
      programme: {
        findUnique: jest.fn().mockResolvedValue({
          id: 1,
          modules: [
            {
              id: 1,
              sousModules: [
                {
                  id: 1,
                  nomSousModule: 'Sous Module 1',
                  nomSousModuleEn: 'Sous Module 1 EN',
                },
                {
                  id: 2,
                  nomSousModule: 'Sous Module 2',
                  nomSousModuleEn: 'Sous Module 2 EN',
                },
                {
                  id: 3,
                  nomSousModule: 'Sous Module 3',
                  nomSousModuleEn: 'Sous Module 3 EN',
                },
              ],
            },
          ],
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);
    const result = await testService.getAllProgrammeModules(1, 1, 2);

    expect(result.status).toBe('success');
    expect(result.code).toBe('200');
    expect(result.data).toHaveLength(2);
    expect(result.pagination.totalCount).toBe(3);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.limitPerPage).toBe(2);
  });

  it('should throw error if programme not found', async () => {
    const mockPrisma = {
      programme: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    await expect(testService.getAllProgrammeModules(999)).rejects.toThrow();
  });

  it('should throw error if programme_id is not provided', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ComparaisonService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: {},
        },
      ],
    }).compile();

    const testService = module.get<ComparaisonService>(ComparaisonService);

    await expect(testService.getAllProgrammeModules(0)).rejects.toThrow();
    await expect(
      testService.getAllProgrammeModules(undefined as unknown as number),
    ).rejects.toThrow();
  });
});
