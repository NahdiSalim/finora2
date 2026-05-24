import type OpenAI from 'openai';

/**
 * OpenAI function-calling tool definitions for the financial chatbot.
 * Each tool maps to a real backend operation.
 */
export const CHATBOT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  // ─── Invoices ────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_invoices',
      description:
        'Retrieve a paginated list of invoices (factures) for the current user. Use this to search, list, or get statistics about invoices.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'number', description: 'Page number (default 1)' },
          limit: { type: 'number', description: 'Items per page (default 10, max 50)' },
          status: {
            type: 'string',
            enum: ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled'],
            description: 'Filter by invoice status',
          },
          search: { type: 'string', description: 'Search by supplier name, company, or tax ID' },
          startDate: {
            type: 'string',
            description: 'Start date filter (ISO 8601, e.g. 2025-01-01)',
          },
          endDate: { type: 'string', description: 'End date filter (ISO 8601, e.g. 2025-12-31)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice_by_id',
      description: 'Get a single invoice by its numeric ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'The invoice ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description:
        'Create a new invoice (facture). Always creates as DRAFT first. Present a summary to the user and ask for confirmation before calling this.',
      parameters: {
        type: 'object',
        properties: {
          invoiceNumber: {
            type: 'string',
            description: 'Unique invoice number (e.g. FAC-2025-001)',
          },
          supplierId: { type: 'number', description: 'ID of the supplier (fournisseur)' },
          dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
          vatRate: { type: 'number', description: 'VAT rate as a percentage (e.g. 19)' },
          discountType: {
            type: 'string',
            enum: ['percentage', 'fixed'],
            description: 'Type of discount',
          },
          discountValue: {
            type: 'number',
            description: 'Discount value (percentage or fixed amount)',
          },
          notes: { type: 'string', description: 'Optional notes for the invoice' },
          amountPaid: { type: 'number', description: 'Amount already paid (default 0)' },
          lines: {
            type: 'array',
            description: 'Invoice line items',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
              },
              required: ['description', 'quantity', 'unitPrice'],
            },
          },
        },
        required: ['invoiceNumber', 'supplierId', 'dueDate', 'vatRate', 'lines'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoice_analytics',
      description:
        'Get financial analytics for invoices: total revenue, total paid, total remaining, overdue count, and counts by status. Use this for monthly/yearly summaries, HT/TTC totals, and financial overviews.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description:
              'Start date filter (ISO 8601). For "this month" use first day of current month.',
          },
          endDate: {
            type: 'string',
            description:
              'End date filter (ISO 8601). For "this month" use last day of current month.',
          },
        },
        required: [],
      },
    },
  },

  // ─── Devis ───────────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_devis',
      description: 'Retrieve a paginated list of quotes (devis).',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          status: {
            type: 'string',
            enum: ['en_attente', 'accepte', 'refuse'],
            description: 'Filter by devis status',
          },
          search: { type: 'string', description: 'Search by supplier name or company' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_devis',
      description:
        'Create a new quote (devis). Always creates as draft (en_attente). Present a summary to the user and ask for confirmation before calling this.',
      parameters: {
        type: 'object',
        properties: {
          number: {
            type: 'string',
            description: 'Devis number (e.g. DEV-2025-001). Auto-generated if omitted.',
          },
          supplierId: { type: 'number', description: 'ID of the supplier' },
          tvaRate: { type: 'number', description: 'TVA rate as a percentage (e.g. 19)' },
          validUntil: { type: 'string', description: 'Validity date in YYYY-MM-DD format' },
          notes: { type: 'string', description: 'Optional notes' },
          lines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
              },
              required: ['description', 'quantity', 'unitPrice'],
            },
          },
        },
        required: ['tvaRate', 'validUntil', 'lines'],
      },
    },
  },

  // ─── Suppliers ───────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_suppliers',
      description:
        'List suppliers (fournisseurs) for the current company. Use this to find supplier IDs before creating invoices or devis.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Search by name, company, email, or tax ID' },
          page: { type: 'number' },
          limit: { type: 'number' },
        },
        required: [],
      },
    },
  },

  // ─── Bon de Commande ─────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'get_bons_commande',
      description: 'Retrieve a list of purchase orders (bons de commande).',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'number' },
          limit: { type: 'number' },
          status: {
            type: 'string',
            enum: ['brouillon', 'confirme', 'annule'],
          },
          search: { type: 'string' },
        },
        required: [],
      },
    },
  },

  // ─── Calculations ────────────────────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'calculate_tva',
      description:
        'Calculate HT (before tax), TVA amount, and TTC (total with tax) from given values. Use this for any tax calculation instead of guessing.',
      parameters: {
        type: 'object',
        properties: {
          amountHT: {
            type: 'number',
            description: 'Amount before tax (HT). Provide this OR amountTTC.',
          },
          amountTTC: {
            type: 'number',
            description: 'Amount with tax (TTC). Provide this OR amountHT.',
          },
          tvaRate: { type: 'number', description: 'TVA rate as a percentage (e.g. 19)' },
        },
        required: ['tvaRate'],
      },
    },
  },

  // ─── Fraud / Anomaly Detection ───────────────────────────────────────────────
  {
    type: 'function',
    function: {
      name: 'detect_anomalies',
      description:
        'Analyze invoices for potential fraud, duplicates, or anomalies. Checks for duplicate invoice numbers, unusually high amounts, overdue invoices, and inconsistent VAT rates.',
      parameters: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date for analysis (ISO 8601)' },
          endDate: { type: 'string', description: 'End date for analysis (ISO 8601)' },
        },
        required: [],
      },
    },
  },
];
