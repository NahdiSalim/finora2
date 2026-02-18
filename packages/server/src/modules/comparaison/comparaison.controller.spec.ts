import { Test, TestingModule } from '@nestjs/testing';
import { ComparaisonController } from './comparaison.controller';
import { ComparaisonService } from './comparaison.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

describe('ComparaisonController', () => {
  let controller: ComparaisonController;
  let module: TestingModule;
  let comparaisonService: ComparaisonService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ComparaisonController],
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

    controller = module.get<ComparaisonController>(ComparaisonController);
    comparaisonService = module.get<ComparaisonService>(ComparaisonService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should export comparaisons to CSV', async () => {
    const mockExportData = {
      csv: 'Référence,Programme comparable,Programme comparé,Taux de similarité,Date de comparaison\n1,Programme Name,Another Programme,85.50%,2024-01-01',
      filename: 'comparaisons_export_fr_2024-01-01.csv',
    };

    const mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    jest
      .spyOn(comparaisonService, 'exportComparaisonsToCSV')
      .mockResolvedValue(mockExportData);

    await controller.exportComparaisonsToCSV(mockResponse, 'fr', '0', '100');

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment; filename*='),
    );
    // Verify that a Buffer is sent (for proper UTF-8 encoding)
    expect(mockResponse.send).toHaveBeenCalled();
    const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
    expect(Buffer.isBuffer(sendCall)).toBe(true);
  });

  it('should get all classification list', async () => {
    const mockClassificationData = {
      status: 'success',
      code: '200',
      data: {
        'soft skills': [
          {
            module: 'Module Name',
            module_en: 'Module Name EN',
            task_id: 1,
            ecart: 'Task Description',
            ecart_en: 'Task Description EN',
            code_module: 'M1',
            code_objectif: 'O1',
          },
        ],
        'technical skills': [],
        'green skills': [],
        'language skills': [],
        unrecognized: [],
      },
    };

    jest
      .spyOn(comparaisonService, 'getAllClassificationList')
      .mockResolvedValue(mockClassificationData);

    const result = await controller.getAllClassificationList(55);
    expect(result).toEqual(mockClassificationData);
  });

  it('should export comparaison matrices to CSV', async () => {
    const mockExportData = {
      csv: '\uFEFF,,\n,Nombre de modules,Heures\n',
      filename: 'comparaison_matrices_55_fr_2024-01-01.csv',
    };

    const mockResponse = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    jest
      .spyOn(comparaisonService, 'exportComparaisonCsvById')
      .mockResolvedValue(mockExportData);

    await controller.exportComparaisonCsvById(mockResponse, 55, 'fr');

    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(mockResponse.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringContaining('attachment; filename*='),
    );
    expect(mockResponse.send).toHaveBeenCalled();
    const sendCall = (mockResponse.send as jest.Mock).mock.calls[0][0];
    expect(Buffer.isBuffer(sendCall)).toBe(true);
  });

  it('should get pre-comparaison', async () => {
    const mockPreComparaisonData = {
      status: 'success',
      code: '200',
      data: {
        similarProgrammes: [],
      },
    };

    jest
      .spyOn(comparaisonService, 'getPreComparaison')
      .mockResolvedValue(mockPreComparaisonData);

    const result = await controller.getPreComparaison(1294);
    expect(result).toEqual(mockPreComparaisonData);
  });

  it('should call ecarts classification', async () => {
    const mockClassificationData = {
      status: 'success',
      code: '200',
      data: {
        classification: [],
      },
    };

    const body = {
      comparaison_id: 55,
      tasks: [
        {
          module: 'Module Name',
          ecart: 'Sous Module Name',
        },
      ],
    };

    jest
      .spyOn(comparaisonService, 'ecartsClassification')
      .mockResolvedValue(mockClassificationData);

    const result = await controller.ecartsClassification(body, 'fr');
    expect(result).toEqual(mockClassificationData);
    expect(comparaisonService.ecartsClassification).toHaveBeenCalledWith(
      body,
      'fr',
    );
  });

  it('should call ecarts classification update', async () => {
    const mockUpdateData = {
      status: 'success',
      code: '200',
      data: {
        success: true,
      },
    };

    const body = {
      task_id: 1,
      task_class: 'soft skills',
    };

    jest
      .spyOn(comparaisonService, 'ecartsClassificationUpdate')
      .mockResolvedValue(mockUpdateData);

    const result = await controller.ecartsClassificationUpdate(body);
    expect(result).toEqual(mockUpdateData);
    expect(comparaisonService.ecartsClassificationUpdate).toHaveBeenCalledWith(
      body,
    );
  });

  it('should call remove similarity', async () => {
    const mockRemoveData = {
      status: 'success',
      code: '200',
      data: {
        msg: 'Similarity removed successfully',
      },
    };

    const body = {
      similarity_id: 1,
      comparaison_id: 55,
    };

    jest
      .spyOn(comparaisonService, 'removeSimilarity')
      .mockResolvedValue(mockRemoveData);

    const result = await controller.removeSimilarity(body);
    expect(result).toEqual(mockRemoveData);
    expect(comparaisonService.removeSimilarity).toHaveBeenCalledWith(body);
  });

  it('should get all programme modules', async () => {
    const mockProgrammeModulesData = {
      status: 'success',
      code: '200',
      data: [
        {
          id: 1,
          name: 'Sous Module 1',
          nameEn: 'Sous Module 1 EN',
        },
        {
          id: 2,
          name: 'Sous Module 2',
          nameEn: 'Sous Module 2 EN',
        },
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        limitPerPage: 10,
        totalCount: 2,
      },
    };

    jest
      .spyOn(comparaisonService, 'getAllProgrammeModules')
      .mockResolvedValue(mockProgrammeModulesData);

    const result = await controller.getAllProgrammeModules(1, '1', '10');
    expect(result).toEqual(mockProgrammeModulesData);
    expect(comparaisonService.getAllProgrammeModules).toHaveBeenCalledWith(
      1,
      1,
      10,
    );
  });
});
