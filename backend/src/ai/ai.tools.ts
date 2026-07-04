export const AI_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_revenue_report',
      description:
        'Get revenue, sales, and financial performance data. Use for questions about earnings, income, profit, how much was made, daily/weekly/monthly revenue.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'yesterday', 'week', 'month', 'year', 'all'],
            description: 'The time period for the report',
          },
        },
        required: ['period'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transactions',
      description:
        'Retrieve transaction history. Use for questions about payments received, money sent, transaction list, payment history.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['CREDIT', 'DEBIT', 'TRANSFER'],
            description: 'Filter by transaction type',
          },
          startDate: { type: 'string', description: 'Start date ISO format' },
          endDate: { type: 'string', description: 'End date ISO format' },
          limit: { type: 'number', description: 'Number of records to return' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description:
        'Create a new invoice for a customer. Use when merchant wants to generate, create, or make an invoice or bill.',
      parameters: {
        type: 'object',
        properties: {
          customerName: { type: 'string', description: 'Name of the customer' },
          customerEmail: {
            type: 'string',
            description: 'Email of customer (optional)',
          },
          amount: {
            type: 'number',
            description: 'Total invoice amount in Naira',
          },
          items: {
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
          dueDate: {
            type: 'string',
            description: 'Due date ISO format (optional)',
          },
        },
        required: ['customerName', 'amount', 'items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_payment_reminder',
      description:
        'Send a payment reminder for a specific invoice. Use when merchant wants to remind a customer to pay.',
      parameters: {
        type: 'object',
        properties: {
          invoiceId: {
            type: 'string',
            description: 'Invoice ID to send reminder for',
          },
          customerName: {
            type: 'string',
            description: 'Customer name to find invoice (if id not known)',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'initiate_transfer',
      description:
        'Transfer money to a bank account via Nomba. Use for questions about sending money, paying suppliers, making transfers. ALWAYS ask for confirmation before executing.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Amount in Naira to transfer',
          },
          beneficiaryAccountNumber: {
            type: 'string',
            description: 'Recipient bank account number',
          },
          beneficiaryBankCode: {
            type: 'string',
            description: 'Recipient bank code',
          },
          narration: {
            type: 'string',
            description: 'Transfer description/narration',
          },
          requiresConfirmation: {
            type: 'boolean',
            description:
              'Always true for transfers - must be confirmed by merchant',
          },
        },
        required: [
          'amount',
          'beneficiaryAccountNumber',
          'beneficiaryBankCode',
          'narration',
        ],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account_balance',
      description:
        'Get the current account balance from Nomba. Use when merchant asks about their balance, how much money they have.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customers',
      description:
        'Get customer list and analytics. Use for questions about who are the top customers, customer count, returning customers.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['all', 'top', 'lifetime_value'],
            description: 'Type of customer data',
          },
          limit: {
            type: 'number',
            description: 'Number of customers to return',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_products',
      description:
        'Get product and inventory information. Use for questions about stock levels, low inventory, products.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['all', 'low_stock', 'summary'],
            description: 'Type of product data',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_invoices',
      description:
        'Get invoice list and status. Use for questions about pending invoices, outstanding payments, bills.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['PENDING', 'PAID', 'OVERDUE', 'CANCELLED'],
            description: 'Filter by status',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_business_performance',
      description:
        'Provide a comprehensive analysis of business health, trends, anomalies, and recommendations. Use for open-ended questions like "why are sales dropping", "how is my business doing", "give me insights".',
      parameters: {
        type: 'object',
        properties: {
          aspect: {
            type: 'string',
            enum: ['overall', 'revenue', 'customers', 'products', 'invoices'],
            description: 'Which aspect to analyze',
          },
        },
        required: ['aspect'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_payment_link',
      description:
        'Create a Nomba payment link for collecting payments. Use when merchant wants a link to share for payment.',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Amount in Naira' },
          description: {
            type: 'string',
            description: 'What the payment is for',
          },
          customerEmail: {
            type: 'string',
            description: 'Customer email (optional)',
          },
          customerName: {
            type: 'string',
            description: 'Customer name (optional)',
          },
        },
        required: ['amount', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_banks_list',
      description: 'Get list of supported banks for transfers.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'verify_bank_account',
      description: 'Verify a bank account number before making a transfer.',
      parameters: {
        type: 'object',
        properties: {
          accountNumber: {
            type: 'string',
            description: 'The account number to verify',
          },
          bankCode: { type: 'string', description: 'The bank code' },
        },
        required: ['accountNumber', 'bankCode'],
      },
    },
  },
];
