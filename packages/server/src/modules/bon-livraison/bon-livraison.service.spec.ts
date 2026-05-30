import { Test, TestingModule } from '@nestjs/testing';
import { BonLivraisonService } from './bon-livraison.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('BonLivraisonService', () => {
  let service: BonLivraisonService;

  const userId = 4;
  const companyId = 2;

  const mockPrisma = {
    bonLivraison: {
      findUnique: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
    },
  };

  const blLines = [
    { id: 'line-1', description: 'Matériel informatique', quantity: 2, unitPrice: 1500 },
    { id: 'line-2', description: 'Installation et configuration', quantity: 1, unitPrice: 800 },
  ];

  const livreBonLivraison = {
    id: 20,
    number: 'BL-2026-004',
    status: 'livre',
    tvaRate: 19,
    deliveryDate: new Date('2026-04-15'),
    lines: blLines,
    notes: 'Livraison entrepôt principal',
    amountHT: 3800,
    amountTVA: 722,
    amountTTC: 4522,
    ownerId: userId,
    companyId,
    createdBy: userId,
    createdByCompanyId: companyId,
    supplierId: 3,
    supplier: { id: 3, name: 'Karim Ben Salah', company: 'Tunisie Informatique SARL' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [BonLivraisonService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<BonLivraisonService>(BonLivraisonService);
  });

  // ─── 5.6.4 Test Unitaire « Workflow de conversion BL → Facture » ─────────────
  describe('5.6.4 — Workflow de conversion BL → Facture (convertBonLivraisonToInvoice)', () => {
    const convertDto = { invoiceNumber: 'FAC-2026-015' };

    const mockInvoice = {
      id: 55,
      invoiceNumber: convertDto.invoiceNumber,
      status: 'draft',
      vatRate: 19,
      subtotal: 3800,
      vatAmount: 722,
      total: 4522,
      amountPaid: 0,
      remainingAmount: 4522,
      lines: blLines.map((line, index) => ({
        ...line,
        lineTotal: line.quantity * line.unitPrice,
        order: index,
      })),
    };

    it('devrait créer une facture brouillon avec les lignes héritées du bon de livraison', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));

      mockPrisma.bonLivraison.findUnique.mockResolvedValue(livreBonLivraison);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.convertBonLivraisonToInvoice(20, userId, companyId, convertDto);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: 'FAC-2026-015',
            status: 'draft',
            vatRate: 19,
            subtotal: 3800,
            vatAmount: 722,
            total: 4522,
            amountPaid: 0,
            remainingAmount: 4522,
            supplierId: 3,
            companyId,
            notes: 'Livraison entrepôt principal',
            lines: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  description: 'Matériel informatique',
                  quantity: 2,
                  unitPrice: 1500,
                  order: 0,
                }),
                expect.objectContaining({
                  description: 'Installation et configuration',
                  quantity: 1,
                  unitPrice: 800,
                  order: 1,
                }),
              ]),
            },
          }),
        })
      );
      expect(result.data.invoice).toEqual(mockInvoice);
      expect(result.message).toBe('Bon de livraison converti en facture avec succès');

      jest.useRealTimers();
    });

    it("devrait fixer l'échéance à 30 jours à partir de la date de conversion", async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-04-01T10:00:00.000Z'));

      mockPrisma.bonLivraison.findUnique.mockResolvedValue(livreBonLivraison);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);

      await service.convertBonLivraisonToInvoice(20, userId, companyId, convertDto);

      const createCall = mockPrisma.invoice.create.mock.calls[0][0];
      const dueDate: Date = createCall.data.dueDate;

      const expectedDueDate = new Date('2026-04-01T10:00:00.000Z');
      expectedDueDate.setDate(expectedDueDate.getDate() + 30);

      expect(dueDate.toISOString()).toBe(expectedDueDate.toISOString());

      jest.useRealTimers();
    });

    it('devrait créer la facture avec le statut « brouillon » (draft)', async () => {
      mockPrisma.bonLivraison.findUnique.mockResolvedValue(livreBonLivraison);
      mockPrisma.invoice.create.mockResolvedValue(mockInvoice);

      await service.convertBonLivraisonToInvoice(20, userId, companyId, convertDto);

      expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'draft' }),
        })
      );
    });

    it('devrait rejeter la conversion si le bon de livraison est introuvable', async () => {
      mockPrisma.bonLivraison.findUnique.mockResolvedValue(null);

      await expect(
        service.convertBonLivraisonToInvoice(999, userId, companyId, convertDto)
      ).rejects.toMatchObject({
        message: 'Bon de livraison introuvable',
        statusCode: 404,
      });

      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });

    it('devrait rejeter la conversion si le bon de livraison est annulé', async () => {
      mockPrisma.bonLivraison.findUnique.mockResolvedValue({
        ...livreBonLivraison,
        status: 'annule',
      });

      await expect(
        service.convertBonLivraisonToInvoice(20, userId, companyId, convertDto)
      ).rejects.toMatchObject({
        message: 'Un bon de livraison annulé ne peut pas être converti en facture',
        statusCode: 400,
        errorCode: 'BL_CANCELLED',
      });

      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });

    it("devrait refuser l'accès si le BL appartient à une autre entreprise", async () => {
      mockPrisma.bonLivraison.findUnique.mockResolvedValue({
        ...livreBonLivraison,
        companyId: 99,
      });

      await expect(
        service.convertBonLivraisonToInvoice(20, userId, companyId, convertDto)
      ).rejects.toMatchObject({
        message: 'Accès refusé',
        statusCode: 403,
      });

      expect(mockPrisma.invoice.create).not.toHaveBeenCalled();
    });
  });
});
