import { Test, TestingModule } from '@nestjs/testing';
import { DevisService } from './devis.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';

describe('DevisService', () => {
  let service: DevisService;

  const userId = 4;
  const companyId = 2;

  const mockPrisma = {
    devis: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
    clientAccountingFirmRelationship: { findFirst: jest.fn() },
  };

  const mockMinio = {
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
    deleteFile: jest.fn(),
  };

  const devisLines = [
    { id: 'line-1', description: 'Audit fiscal prévisionnel', quantity: 1, unitPrice: 3200 },
    { id: 'line-2', description: 'Rapport de synthèse', quantity: 1, unitPrice: 600 },
  ];

  const acceptedDevis = {
    id: 10,
    number: 'DEV-2026-002',
    status: 'accepte',
    tvaRate: 19,
    validUntil: new Date('2026-08-31'),
    lines: devisLines,
    notes: "Mission d'audit",
    amountHT: 3800,
    amountTVA: 722,
    amountTTC: 4522,
    ownerId: userId,
    companyId,
    createdBy: userId,
    createdByCompanyId: companyId,
    supplierId: 3,
    supplier: { id: 3, name: 'Hichem Dridi', company: 'Cabinet Juridique Carthage' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevisService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<DevisService>(DevisService);
  });

  // ─── 5.6.2 Test Unitaire « Conversion d'un devis en facture » ────────────────
  describe("5.6.2 — Conversion d'un devis en facture (convertDevisToInvoice)", () => {
    const convertDto = {
      invoiceNumber: 'FAC-2026-010',
      dueDate: '2026-07-15',
    };

    const mockInvoice = {
      id: 50,
      invoiceNumber: convertDto.invoiceNumber,
      status: 'draft',
      vatRate: 19,
      subtotal: 3800,
      vatAmount: 722,
      total: 4522,
      lines: devisLines.map((line, index) => ({
        ...line,
        lineTotal: line.quantity * line.unitPrice,
        order: index,
      })),
    };

    it('devrait créer une facture avec les lignes et montants du devis', async () => {
      mockPrisma.devis.findUnique.mockResolvedValue(acceptedDevis);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.devis.update.mockResolvedValue({ ...acceptedDevis, status: 'facture' });

      const result = await service.convertDevisToInvoice(10, userId, companyId, convertDto);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'FAC-2026-010',
            vatRate: 19,
            subtotal: 3800,
            vatAmount: 722,
            total: 4522,
            supplierId: 3,
            companyId,
            lines: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  description: 'Audit fiscal prévisionnel',
                  quantity: 1,
                  unitPrice: 3200,
                }),
                expect.objectContaining({
                  description: 'Rapport de synthèse',
                  quantity: 1,
                  unitPrice: 600,
                }),
              ]),
            },
          }),
        })
      );
      expect(result.data.invoice).toEqual(mockInvoice);
    });

    it('devrait passer le statut du devis à « facture »', async () => {
      mockPrisma.devis.findUnique.mockResolvedValue(acceptedDevis);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);
      mockPrisma.devis.update.mockResolvedValue({ ...acceptedDevis, status: 'facture' });

      await service.convertDevisToInvoice(10, userId, companyId, convertDto);

      expect(mockPrisma.devis.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'facture' },
      });
    });

    it('devrait rejeter la conversion si le devis est déjà facturé', async () => {
      mockPrisma.devis.findUnique.mockResolvedValue({ ...acceptedDevis, status: 'facture' });

      await expect(
        service.convertDevisToInvoice(10, userId, companyId, convertDto)
      ).rejects.toThrow(ApiError);
    });

    it("devrait empêcher la modification d'un devis facturé", async () => {
      mockPrisma.devis.findUnique.mockResolvedValue({ ...acceptedDevis, status: 'facture' });

      await expect(
        service.updateDevis(10, companyId, { notes: 'Tentative de modification' })
      ).rejects.toThrow('Ce devis est déjà facturé');
    });
  });
});
