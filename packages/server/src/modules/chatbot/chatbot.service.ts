import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../../prisma/prisma.service';
import { CHATBOT_TOOLS } from './chatbot.tools';
import type { ChatHistoryItemDto } from './dto/chat-message.dto';

const SYSTEM_PROMPT = `You are a Financial Operations Assistant for a SaaS accounting platform called Finora.
You help clients manage their invoices (factures), quotes (devis), purchase orders (bons de commande), and suppliers (fournisseurs).
The platform uses Tunisian Dinar (DT) as currency. All amounts are in DT.
The interface language is French — always respond in French.

# Your Capabilities
- Search and retrieve invoices, devis, purchase orders, and suppliers
- Create new invoices and devis (always as DRAFT first, then confirm with user)
- Calculate HT/TVA/TTC amounts using the calculate_tva tool
- Provide financial summaries (monthly/yearly revenue, paid amounts, remaining)
- Detect anomalies, duplicates, or potential fraud in invoices

# Rules
1. **Tool-First**: Always use the provided tools to fetch real data. Never invent numbers.
2. **Draft & Confirm**: For CREATE operations, always present a summary first and ask "Voulez-vous confirmer la création ?" before calling the create tool.
3. **Security**: You only see data for the authenticated user's company. Never mention other companies.
4. **Calculations**: Use calculate_tva tool for any tax math. Never guess.
5. **Context**: Remember the conversation history to resolve references like "cette facture" or "le dernier devis".
6. **IDs**: Always mention the document ID after creating or finding a document so the user can track it.
7. **Dates**: When user says "ce mois" compute the current month's start/end dates. When they say "cette année" use Jan 1 to Dec 31 of current year.
8. **Format**: Present amounts clearly with DT suffix. Use tables in markdown for lists of documents.
9. **Errors**: If a tool returns an error, explain it clearly in French without technical jargon.`;

// ─── Auto-generate a short session title from the first user message ──────────
function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/[?!.]+$/, '');
  return cleaned.length > 50 ? cleaned.slice(0, 47) + '…' : cleaned;
}

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    const useOpenRouterRaw = this.config.get<string>('USE_OPENROUTER');
    const useOpenRouter = useOpenRouterRaw === 'true';

    // 🔍 Debug logging
    this.logger.log('🔍 ChatbotService initialization:');
    this.logger.log(`  - USE_OPENROUTER (raw): "${useOpenRouterRaw}"`);
    this.logger.log(`  - USE_OPENROUTER (parsed): ${useOpenRouter}`);
    this.logger.log(`  - API Key prefix: ${apiKey?.substring(0, 10)}...`);

    if (useOpenRouter) {
      const baseURL = 'https://openrouter.ai/api/v1';
      const headers = {
        'HTTP-Referer': this.config.get<string>('FRONTEND_URL') || 'http://localhost:3039',
        'X-Title': 'Finora Assistant',
      };

      this.logger.log(`  - BaseURL: ${baseURL}`);
      this.logger.log(`  - Headers: ${JSON.stringify(headers)}`);

      this.openai = new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders: headers,
      });
      this.logger.log('✅ Chatbot configured with OpenRouter');
    } else {
      this.logger.log('  - Using default OpenAI endpoint');
      this.openai = new OpenAI({
        apiKey,
      });
      this.logger.log('✅ Chatbot configured with OpenAI');
    }
  }

  // ─── Session management ───────────────────────────────────────────────────

  async getSessions(userId: number, companyId: number) {
    const sessions = await this.prisma.chatbotSession.findMany({
      where: { userId, companyId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, role: true, createdAt: true },
        },
      },
    });

    return sessions.map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      lastMessage: s.messages[0] ?? null,
    }));
  }

  async getSession(sessionId: number, userId: number) {
    const session = await this.prisma.chatbotSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            toolsUsed: true,
            createdAt: true,
          },
        },
      },
    });

    if (!session || session.userId !== userId) {
      return null;
    }

    return session;
  }

  async deleteSession(sessionId: number, userId: number) {
    const session = await this.prisma.chatbotSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) return false;

    await this.prisma.chatbotSession.delete({ where: { id: sessionId } });
    return true;
  }

  async renameSession(sessionId: number, userId: number, title: string) {
    const session = await this.prisma.chatbotSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId) return null;

    return this.prisma.chatbotSession.update({
      where: { id: sessionId },
      data: { title: title.slice(0, 100) },
      select: { id: true, title: true },
    });
  }

  // ─── Main chat ────────────────────────────────────────────────────────────

  async chat(
    userId: number,
    companyId: number,
    message: string,
    sessionId?: number
  ): Promise<{ reply: string; toolsUsed: string[]; sessionId: number }> {
    const toolsUsed: string[] = [];

    // ── Resolve or create session ──────────────────────────────────────────
    let session: { id: number; title: string } | null = null;

    if (sessionId) {
      const existing = await this.prisma.chatbotSession.findUnique({
        where: { id: sessionId },
      });
      if (existing && existing.userId === userId) {
        session = existing;
      }
    }

    if (!session) {
      session = await this.prisma.chatbotSession.create({
        data: {
          userId,
          companyId,
          title: generateTitle(message),
        },
        select: { id: true, title: true },
      });
    }

    // ── Persist user message ───────────────────────────────────────────────
    await this.prisma.chatbotMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message,
        toolsUsed: [],
      },
    });

    // ── Load history from DB (last 20 messages) ────────────────────────────
    const dbHistory = await this.prisma.chatbotMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 40, // fetch 40, we'll use last 20 turns (40 messages)
      select: { role: true, content: true },
    });

    // Build OpenAI message array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...dbHistory.slice(-40).map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
    ];

    // ── Agentic loop ───────────────────────────────────────────────────────
    let iterations = 0;
    const MAX_ITERATIONS = 5;
    let finalReply = "Je suis désolé, je n'ai pas pu compléter votre demande. Veuillez réessayer.";

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await this.openai.chat.completions.create({
        model: this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
        messages,
        tools: CHATBOT_TOOLS,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 1500,
      });

      const choice = response.choices[0];
      if (!choice) break;

      if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
        finalReply = choice.message.content ?? finalReply;
        break;
      }

      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fn = toolCall.type === 'function' ? toolCall.function : null;
        if (!fn) continue;

        const toolName = fn.name;
        if (!toolsUsed.includes(toolName)) toolsUsed.push(toolName);

        let toolArgs: any = {};
        try {
          toolArgs = JSON.parse(fn.arguments);
        } catch {
          this.logger.warn(`Failed to parse tool args for ${toolName}`);
        }

        this.logger.log(`Executing tool: ${toolName}`);

        let toolResult: any;
        try {
          toolResult = await this.executeTool(toolName, toolArgs, userId, companyId);
        } catch (err: any) {
          toolResult = { error: err.message || 'Tool execution failed' };
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    // ── Persist assistant reply ────────────────────────────────────────────
    await this.prisma.chatbotMessage.create({
      data: {
        sessionId: session.id,
        role: 'assistant',
        content: finalReply,
        toolsUsed,
      },
    });

    // Update session timestamp
    await this.prisma.chatbotSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });

    return { reply: finalReply, toolsUsed, sessionId: session.id };
  }

  // ─── Tool Dispatcher ─────────────────────────────────────────────────────

  private async executeTool(
    name: string,
    args: any,
    userId: number,
    companyId: number
  ): Promise<any> {
    switch (name) {
      case 'get_invoices':
        return this.getInvoices(companyId, args);
      case 'get_invoice_by_id':
        return this.getInvoiceById(companyId, args.id);
      case 'create_invoice':
        return this.createInvoice(userId, companyId, args);
      case 'get_invoice_analytics':
        return this.getInvoiceAnalytics(companyId, args);
      case 'get_devis':
        return this.getDevis(companyId, args);
      case 'create_devis':
        return this.createDevis(userId, companyId, args);
      case 'get_suppliers':
        return this.getSuppliers(companyId, args);
      case 'get_bons_commande':
        return this.getBonsCommande(companyId, args);
      case 'calculate_tva':
        return this.calculateTva(args);
      case 'detect_anomalies':
        return this.detectAnomalies(companyId, args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  }

  // ─── Tool Implementations ─────────────────────────────────────────────────

  private async getInvoices(companyId: number, args: any) {
    const { page = 1, limit = 10, status, search, startDate, endDate } = args;
    const skip = (page - 1) * Math.min(limit, 50);
    const where: any = { companyId };

    if (status) where.status = status;
    if (search?.trim()) {
      where.OR = [
        { supplier: { name: { contains: search.trim(), mode: 'insensitive' } } },
        { supplier: { company: { contains: search.trim(), mode: 'insensitive' } } },
        { invoiceNumber: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalCount, invoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          dueDate: true,
          total: true,
          amountPaid: true,
          remainingAmount: true,
          vatRate: true,
          subtotal: true,
          vatAmount: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, company: true } },
        },
      }),
    ]);

    return {
      totalCount,
      page,
      invoices: invoices.map((inv) => ({
        ...inv,
        total: Number(inv.total),
        amountPaid: Number(inv.amountPaid),
        remainingAmount: Number(inv.remainingAmount),
        vatRate: Number(inv.vatRate),
        subtotal: Number(inv.subtotal),
        vatAmount: Number(inv.vatAmount),
      })),
    };
  }

  private async getInvoiceById(companyId: number, id: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { order: 'asc' } },
        supplier: { select: { id: true, name: true, company: true, email: true, phone: true } },
      },
    });

    if (!invoice) return { error: 'Facture non trouvée' };
    if (invoice.companyId !== companyId) return { error: 'Accès refusé' };

    return {
      ...invoice,
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid),
      remainingAmount: Number(invoice.remainingAmount),
      vatRate: Number(invoice.vatRate),
      subtotal: Number(invoice.subtotal),
      vatAmount: Number(invoice.vatAmount),
      lines: invoice.lines.map((l: any) => ({
        ...l,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        lineTotal: Number(l.lineTotal),
      })),
    };
  }

  private async createInvoice(userId: number, companyId: number, args: any) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: args.supplierId } });
    if (!supplier) return { error: 'Fournisseur non trouvé' };
    if (supplier.companyId !== companyId) return { error: 'Ce fournisseur ne vous appartient pas' };

    const subtotal = args.lines.reduce((acc: number, l: any) => acc + l.quantity * l.unitPrice, 0);
    let discount = 0;
    if (args.discountType && args.discountValue) {
      discount =
        args.discountType === 'percentage'
          ? (subtotal * args.discountValue) / 100
          : args.discountValue;
    }
    const afterDiscount = Math.max(subtotal - discount, 0);
    const vatAmount = (afterDiscount * args.vatRate) / 100;
    const total = afterDiscount + vatAmount;
    const round = (v: number) => Math.round(v * 100) / 100;

    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: args.invoiceNumber,
          status: 'draft',
          dueDate: new Date(args.dueDate),
          vatRate: args.vatRate,
          discountType: args.discountType || null,
          discountValue: args.discountValue || null,
          subtotal: round(subtotal),
          discountAmount: round(discount),
          vatAmount: round(vatAmount),
          total: round(total),
          amountPaid: args.amountPaid ?? 0,
          remainingAmount: round(total - (args.amountPaid ?? 0)),
          notes: args.notes || null,
          supplierId: args.supplierId,
          companyId,
          createdById: userId,
          lines: {
            create: args.lines.map((line: any, index: number) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: round(line.quantity * line.unitPrice),
              order: index,
            })),
          },
        },
        include: { lines: true },
      });

      return {
        success: true,
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        total: round(total),
        subtotal: round(subtotal),
        vatAmount: round(vatAmount),
        message: `Facture ${invoice.invoiceNumber} créée avec succès en brouillon (ID: ${invoice.id})`,
      };
    } catch (err: any) {
      if (err.code === 'P2002') {
        return { error: 'Ce numéro de facture existe déjà. Veuillez en choisir un autre.' };
      }
      return { error: 'Erreur lors de la création de la facture' };
    }
  }

  private async getInvoiceAnalytics(companyId: number, args: any) {
    const where: any = { companyId };
    if (args.startDate || args.endDate) {
      where.createdAt = {};
      if (args.startDate) where.createdAt.gte = new Date(args.startDate);
      if (args.endDate) where.createdAt.lte = new Date(args.endDate);
    }

    const [aggregate, countByStatus] = await Promise.all([
      this.prisma.invoice.aggregate({
        where,
        _sum: {
          total: true,
          amountPaid: true,
          remainingAmount: true,
          subtotal: true,
          vatAmount: true,
        },
        _count: { id: true },
      }),
      this.prisma.invoice.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { total: true },
      }),
    ]);

    const round = (v: number) => Math.round(v * 100) / 100;
    const statusMap: Record<string, { count: number; total: number }> = {};
    for (const row of countByStatus) {
      statusMap[row.status] = {
        count: row._count.id,
        total: round(Number(row._sum.total ?? 0)),
      };
    }

    return {
      period: { startDate: args.startDate || 'all time', endDate: args.endDate || 'all time' },
      totalInvoices: aggregate._count.id,
      totalRevenueTTC: round(Number(aggregate._sum.total ?? 0)),
      totalRevenueHT: round(Number(aggregate._sum.subtotal ?? 0)),
      totalTVA: round(Number(aggregate._sum.vatAmount ?? 0)),
      totalPaid: round(Number(aggregate._sum.amountPaid ?? 0)),
      totalRemaining: round(Number(aggregate._sum.remainingAmount ?? 0)),
      byStatus: statusMap,
    };
  }

  private async getDevis(companyId: number, args: any) {
    const { page = 1, limit = 10, status, search } = args;
    const skip = (page - 1) * Math.min(limit, 50);
    const where: any = { companyId };

    if (status) where.status = status;
    if (search?.trim()) {
      where.OR = [
        { supplier: { name: { contains: search.trim(), mode: 'insensitive' } } },
        { supplier: { company: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const [totalCount, devisList] = await Promise.all([
      this.prisma.devis.count({ where }),
      this.prisma.devis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
        select: {
          id: true,
          number: true,
          status: true,
          tvaRate: true,
          validUntil: true,
          amountHT: true,
          amountTVA: true,
          amountTTC: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, company: true } },
        },
      }),
    ]);

    return {
      totalCount,
      page,
      devis: devisList.map((d) => ({
        ...d,
        amountHT: Number(d.amountHT),
        amountTVA: Number(d.amountTVA),
        amountTTC: Number(d.amountTTC),
        tvaRate: Number(d.tvaRate),
      })),
    };
  }

  private async createDevis(userId: number, companyId: number, args: any) {
    const subtotal = args.lines.reduce((acc: number, l: any) => acc + l.quantity * l.unitPrice, 0);
    const vatAmount = (subtotal * args.tvaRate) / 100;
    const total = subtotal + vatAmount;
    const round = (v: number) => Math.round(v * 100) / 100;
    const number = args.number || `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

    const devis = await this.prisma.devis.create({
      data: {
        number,
        status: 'en_attente',
        tvaRate: args.tvaRate,
        validUntil: new Date(args.validUntil),
        lines: args.lines,
        notes: args.notes || null,
        amountHT: round(subtotal),
        amountTVA: round(vatAmount),
        amountTTC: round(total),
        ownerId: userId,
        companyId,
        createdBy: userId,
        createdByCompanyId: companyId,
        ...(args.supplierId && { supplierId: args.supplierId }),
      },
    });

    return {
      success: true,
      id: devis.id,
      number: devis.number,
      status: devis.status,
      amountHT: round(subtotal),
      amountTVA: round(vatAmount),
      amountTTC: round(total),
      message: `Devis ${devis.number} créé avec succès (ID: ${devis.id})`,
    };
  }

  private async getSuppliers(companyId: number, args: any) {
    const { page = 1, limit = 20, search } = args;
    const skip = (page - 1) * Math.min(limit, 50);
    const where: any = { companyId };

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { company: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { taxId: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [totalCount, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
        select: { id: true, name: true, company: true, email: true, phone: true, taxId: true },
      }),
    ]);

    return { totalCount, suppliers };
  }

  private async getBonsCommande(companyId: number, args: any) {
    const { page = 1, limit = 10, status, search } = args;
    const skip = (page - 1) * Math.min(limit, 50);
    const where: any = { companyId };

    if (status) where.status = status;
    if (search?.trim()) {
      where.OR = [
        { supplier: { name: { contains: search.trim(), mode: 'insensitive' } } },
        { number: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [totalCount, bons] = await Promise.all([
      this.prisma.bonCommande.count({ where }),
      this.prisma.bonCommande.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Math.min(limit, 50),
        select: {
          id: true,
          number: true,
          status: true,
          amountHT: true,
          amountTVA: true,
          amountTTC: true,
          createdAt: true,
          supplier: { select: { id: true, name: true, company: true } },
        },
      }),
    ]);

    return {
      totalCount,
      bons: bons.map((b) => ({
        ...b,
        amountHT: Number(b.amountHT),
        amountTVA: Number(b.amountTVA),
        amountTTC: Number(b.amountTTC),
      })),
    };
  }

  private calculateTva(args: any) {
    const { tvaRate } = args;
    const round = (v: number) => Math.round(v * 100) / 100;

    if (args.amountHT !== undefined) {
      const amountHT = args.amountHT;
      const tva = (amountHT * tvaRate) / 100;
      return {
        amountHT: round(amountHT),
        tva: round(tva),
        amountTTC: round(amountHT + tva),
        tvaRate,
      };
    }

    if (args.amountTTC !== undefined) {
      const amountTTC = args.amountTTC;
      const amountHT = amountTTC / (1 + tvaRate / 100);
      const tva = amountTTC - amountHT;
      return { amountHT: round(amountHT), tva: round(tva), amountTTC: round(amountTTC), tvaRate };
    }

    return { error: 'Veuillez fournir amountHT ou amountTTC' };
  }

  private async detectAnomalies(companyId: number, args: any) {
    const where: any = { companyId };
    if (args.startDate || args.endDate) {
      where.createdAt = {};
      if (args.startDate) where.createdAt.gte = new Date(args.startDate);
      if (args.endDate) where.createdAt.lte = new Date(args.endDate);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        vatRate: true,
        dueDate: true,
        createdAt: true,
        supplier: { select: { name: true, company: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const anomalies: any[] = [];

    // 1. Duplicate invoice numbers
    const numberCount: Record<string, number[]> = {};
    for (const inv of invoices) {
      if (!numberCount[inv.invoiceNumber]) numberCount[inv.invoiceNumber] = [];
      numberCount[inv.invoiceNumber].push(inv.id);
    }
    for (const [num, ids] of Object.entries(numberCount)) {
      if (ids.length > 1) {
        anomalies.push({
          type: 'DUPLICATE_NUMBER',
          severity: 'HIGH',
          description: `Numéro dupliqué: ${num}`,
          affectedIds: ids,
        });
      }
    }

    // 2. Overdue invoices
    const now = new Date();
    const overdue = invoices.filter(
      (inv) => new Date(inv.dueDate) < now && inv.status !== 'paid' && inv.status !== 'cancelled'
    );
    if (overdue.length > 0) {
      anomalies.push({
        type: 'OVERDUE_INVOICES',
        severity: 'MEDIUM',
        description: `${overdue.length} facture(s) en retard`,
        affectedIds: overdue.map((i) => i.id),
      });
    }

    // 3. Unusual VAT rates
    const standardRates = [0, 7, 13, 19];
    const unusualVat = invoices.filter((inv) => !standardRates.includes(Number(inv.vatRate)));
    if (unusualVat.length > 0) {
      anomalies.push({
        type: 'UNUSUAL_VAT_RATE',
        severity: 'MEDIUM',
        description: `${unusualVat.length} facture(s) avec TVA inhabituelle`,
        affectedIds: unusualVat.map((i) => ({ id: i.id, vatRate: Number(i.vatRate) })),
      });
    }

    // 4. Unusually high amounts
    if (invoices.length > 3) {
      const totals = invoices.map((i) => Number(i.total));
      const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
      const threshold = avg * 3;
      const high = invoices.filter((i) => Number(i.total) > threshold);
      if (high.length > 0) {
        anomalies.push({
          type: 'HIGH_AMOUNT',
          severity: 'LOW',
          description: `${high.length} facture(s) avec montant > 3x la moyenne (${Math.round(avg)} DT)`,
          affectedIds: high.map((i) => ({ id: i.id, total: Number(i.total) })),
        });
      }
    }

    return {
      totalAnalyzed: invoices.length,
      anomaliesFound: anomalies.length,
      anomalies,
      summary:
        anomalies.length === 0
          ? 'Aucune anomalie détectée.'
          : `${anomalies.length} type(s) d'anomalie détecté(s).`,
    };
  }
}
