export enum FinancialStatementType {
  INCOME = 'Income Statement',
  BALANCE = 'Balance Sheet',
  CASH_FLOW = 'Cash Flow Statement'
}

export interface FinancialState {
  cash: number; // Kept for top-bar easy access
  revenue: number;
  cogs: number; // Cost of Goods Sold
  grossProfit: number;
  operatingExpenses: number; // Rent, Wages, Marketing (Recurring)
  
  // Amortization System
  deferredStrategyCosts: number; // Pool of expense waiting to be recognized
  amortizationExpense: number; // The portion recognized this month
  
  oneTimeExpenses: number; // Minor misc expenses
  ebitda: number;
  depreciation: number;
  ebit: number;
  interest: number;
  tax: number;
  netIncome: number;
  
  // Trackers for Statement Display (Reset monthly)
  capitalExpenditures: number; 
  cashFlowFromInvesting: number;
  cashFlowFromFinancing: number;

  // Balance Sheet
  assets: {
    cash: number;
    accountsReceivable: number;
    inventory: number;
    prepaidExpenses: number; // New asset class for deferred strategy costs
    equipment: number;
    accumulatedDepreciation: number;
  };
  liabilities: {
    accountsPayable: number;
    accruedExpenses: number;
    loans: number;
  };
  equity: {
    contributedCapital: number;
    retainedEarnings: number;
    sharesOutstanding: number;
  };

  // Metrics
  customerSatisfaction: number; // 0-100
  dailyOrders: number;
  averageOrderValue: number;
}

export interface Strategy {
  id: string;
  title: string;
  description: string;
  type: 'Revenue' | 'Profit' | 'Efficiency' | 'Speculative';
  cost: number;
  cooldown: number; // in game months
  successRate?: number; // 0.0 to 1.0. If undefined, 1.0
  impact: (state: FinancialState) => FinancialState;
  failureImpact?: (state: FinancialState) => FinancialState;
  quality?: 'Good' | 'Bad'; // Categorization for post-execution analysis
  successLog?: string;
  failureLog?: string;
}

export interface GameLog {
  month: number;
  message: string;
  type: 'info' | 'positive' | 'negative';
}

export interface HistoryData {
  month: number;
  revenue: number;
  profit: number;
  cash: number;
  stockPrice: number;
}