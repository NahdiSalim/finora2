import { Test, TestingModule } from '@nestjs/testing';
import * as puppeteer from 'puppeteer';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';

jest.mock('puppeteer', () => ({
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn().mockResolvedValue(undefined),
      pdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock invoice')),
    }),
    close: jest.fn().mockResolvedValue(undefined),
  }),
}));

describe('InvoiceService', () => {
  let service: InvoiceService;

  const mockPrisma = {
    invoice: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    document: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
    supplier: { findUnique: jest.fn() },
  };

  const mockMinio = {
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
    downloadFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  // ─── 5.6.1 Test Unitaire « Calcul des totaux financiers » ───────────────────
  describe('5.6.1 — Calcul des totaux financiers (calculateAmounts)', () => {
    const calculateAmounts = (dto: {
      lines: { quantity: number; unitPrice: number }[];
      vatRate: number;
      discountType?: string;
      discountValue?: number;
    }) => (service as any).calculateAmounts(dto);

    it('devrait calculer HT, TVA et TTC pour plusieurs lignes à 19 %', () => {
      const result = calculateAmounts({
        lines: [
          { quantity: 3, unitPrice: 850 },
          { quantity: 1, unitPrice: 450 },
        ],
        vatRate: 19,
      });

      expect(result.subtotal).toBe(3000);
      expect(result.discountAmount).toBe(0);
      expect(result.vatAmount).toBe(570);
      expect(result.total).toBe(3570);
    });

    it('devrait appliquer une remise en pourcentage avant le calcul de TVA', () => {
      const result = calculateAmounts({
        lines: [
          { quantity: 5, unitPrice: 240 },
          { quantity: 1, unitPrice: 600 },
        ],
        vatRate: 19,
        discountType: 'percentage',
        discountValue: 5,
      });

      expect(result.subtotal).toBe(1800);
      expect(result.discountAmount).toBe(90);
      expect(result.vatAmount).toBe(324.9);
      expect(result.total).toBe(2034.9);
    });

    it('devrait arrondir correctement les centimes avec TVA à 7 %', () => {
      const result = calculateAmounts({
        lines: [{ quantity: 2, unitPrice: 420 }],
        vatRate: 7,
      });

      expect(result.subtotal).toBe(840);
      expect(result.vatAmount).toBe(58.8);
      expect(result.total).toBe(898.8);
    });

    it('devrait gérer les quantités décimales et arrondir au centime', () => {
      const result = calculateAmounts({
        lines: [{ quantity: 3, unitPrice: 33.33 }],
        vatRate: 19,
      });

      expect(result.subtotal).toBe(99.99);
      expect(result.vatAmount).toBe(19);
      expect(result.total).toBe(118.99);
    });
  });

  // ─── 5.6.3 Test Unitaire « Génération de PDF avec Puppeteer » ───────────────
  describe('5.6.3 — Génération de PDF avec Puppeteer (generateAndSavePdf)', () => {
    const mockInvoice = {
      id: 1,
      invoiceNumber: 'FAC-2026-001',
      status: 'sent',
      dueDate: new Date('2026-06-30'),
      vatRate: 19,
      subtotal: 3000,
      discountAmount: 0,
      vatAmount: 570,
      total: 3570,
      amountPaid: 0,
      remainingAmount: 3570,
      notes: 'Paiement à 30 jours',
      createdAt: new Date('2026-04-01'),
      createdById: 4,
      company: {
        name: 'Entreprise Client SARL',
        legalName: 'Entreprise Client SARL',
        address: '456 Rue de la République',
        city: 'Tunis',
        postalCode: '1001',
        phone: '+216 71 987 654',
        email: 'contact@client-company.com',
        vatNumber: 'FR98765432109',
        logo: null,
      },
      supplier: {
        name: 'Karim Ben Salah',
        company: 'Tunisie Informatique SARL',
        email: 'contact@tunisie-info.tn',
        phone: '+216 71 240 500',
        address: "12 Rue de l'Industrie, Tunis",
        taxId: '1234567A/M/000',
        logoUrl: null,
      },
      lines: [
        {
          description: 'Tenue comptable — Trimestre 1',
          quantity: 3,
          unitPrice: 850,
          lineTotal: 2550,
          order: 0,
        },
        {
          description: 'Déclaration TVA T1',
          quantity: 1,
          unitPrice: 450,
          lineTotal: 450,
          order: 1,
        },
      ],
    };

    it('devrait générer un PDF via Puppeteer avec les montants financiers', async () => {
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockPrisma.document.findFirst
        .mockResolvedValueOnce({ id: 10, name: 'factures', parentId: null })
        .mockResolvedValueOnce({ id: 11, name: '2026-04', parentId: 10 })
        .mockResolvedValueOnce({
          id: 12,
          name: 'Tunisie Informatique SARL',
          parentId: 11,
        });
      mockPrisma.document.findUnique.mockImplementation(({ where }: { where: { id: number } }) => {
        const folders: Record<number, { name: string; parentId: number | null }> = {
          12: { name: 'Tunisie Informatique SARL', parentId: 11 },
          11: { name: '2026-04', parentId: 10 },
          10: { name: 'factures', parentId: null },
        };
        return Promise.resolve(folders[where.id] ?? null);
      });
      mockMinio.uploadFile.mockResolvedValue('factures/2026-04/FAC-2026-001.pdf');
      mockPrisma.document.create.mockResolvedValue({ id: 99 });
      mockPrisma.invoice.update.mockResolvedValue(mockInvoice);

      await (service as any).generateAndSavePdf(1, 5);

      expect(puppeteer.launch).toHaveBeenCalled();
      const browser = await puppeteer.launch.mock.results[0].value;
      const page = await browser.newPage.mock.results[0].value;

      expect(page.setContent).toHaveBeenCalledWith(
        expect.stringContaining('TOTAL TTC'),
        expect.any(Object)
      );
      expect(page.setContent).toHaveBeenCalledWith(
        expect.stringMatching(/3.570,00 DT/),
        expect.any(Object)
      );
      expect(page.pdf).toHaveBeenCalledWith(
        expect.objectContaining({ format: 'A4', printBackground: true })
      );
      expect(mockMinio.uploadFile).toHaveBeenCalledWith(
        5,
        expect.any(String),
        expect.objectContaining({ mimetype: 'application/pdf' })
      );
      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { documentId: 99 },
      });
    });

    it('devrait inclure le numéro de facture et les lignes dans le HTML', async () => {
      const html = await (service as any).buildHtml(mockInvoice);

      expect(html).toContain('FAC-2026-001');
      expect(html).toContain('Tenue comptable — Trimestre 1');
      expect(html).toContain('TOTAL HT');
      expect(html).toContain('TVA (19%)');
    });
  });
});
