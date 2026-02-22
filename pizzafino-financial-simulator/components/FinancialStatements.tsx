import React, { useState } from 'react';
import { FinancialState, FinancialStatementType } from '../types';

interface Props {
  data: FinancialState;
}

const FinancialStatements: React.FC<Props> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<FinancialStatementType>(FinancialStatementType.INCOME);

  // Format currency helper
  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const pct = (n: number, total: number) => total === 0 ? '0%' : `${((n / total) * 100).toFixed(1)}%`;

  const Row = ({ label, value, sub = false, bold = false, border = false, color = 'text-gray-800' }: any) => (
    <div className={`flex justify-between py-1 ${border ? 'border-t border-gray-200 mt-1 pt-1' : ''}`}>
        <span className={`${sub ? 'pl-6 text-gray-500 text-xs' : 'text-sm'} ${bold ? 'font-bold' : ''}`}>{label}</span>
        <span className={`text-sm ${bold ? 'font-bold' : ''} ${color}`}>{value}</span>
    </div>
  );

  // EBIT calculation update to include amortization
  // EBIT = Gross Profit - OpEx - Amortization - Depreciation
  
  // Note: data.ebit is already calculated in App.tsx correctly with these factors.
  // We just display them here.

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-full font-sans">
      <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2">
        {Object.values(FinancialStatementType).map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === type
                ? 'bg-pizza-dark text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
        
        {/* --- INCOME STATEMENT --- */}
        {activeTab === FinancialStatementType.INCOME && (
          <div className="space-y-2 animate-fadeIn max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-center mb-6 uppercase tracking-widest border-b-2 border-pizza-red pb-2">Income Statement</h3>
            
            <Row label="Revenue" value={fmt(data.revenue)} bold />
            <Row label="Cost of Goods Sold" value={`(${fmt(data.cogs)})`} sub color="text-red-500" />
            
            <Row label="Gross Profit" value={fmt(data.grossProfit)} bold border />
            <div className="text-right text-[10px] text-gray-400 mb-2">Margin: {pct(data.grossProfit, data.revenue)}</div>

            {/* Operating Expenses Section */}
            <div className="space-y-1">
                <Row label="Recurring Operating Expenses" value={`(${fmt(data.operatingExpenses)})`} sub color="text-red-500" />
                {data.amortizationExpense > 0 && (
                     <Row label="Strategy Amortization" value={`(${fmt(data.amortizationExpense)})`} sub color="text-red-500" />
                )}
                {data.oneTimeExpenses > 0 && (
                    <Row label="Misc. One-Time Costs" value={`(${fmt(data.oneTimeExpenses)})`} sub color="text-red-500" />
                )}
                <Row label="Depreciation" value={`(${fmt(data.depreciation)})`} sub color="text-red-500" />
            </div>
            
            <Row label="Operating Income (EBIT)" value={fmt(data.ebit)} bold border />

            {/* Add back section for EBITDA visibility */}
            <div className="pl-6 py-1 border-l-2 border-gray-100 my-1">
                <div className="flex justify-between text-xs text-gray-500 italic">
                    <span>+ Depreciation & Amortization</span>
                    <span>{fmt(data.depreciation + data.amortizationExpense)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-gray-600 mt-1">
                    <span>= EBITDA</span>
                    <span>{fmt(data.ebitda)}</span>
                </div>
            </div>
            
            <Row label="Interest Expense" value={`(${fmt(data.interest)})`} sub color="text-red-500" />
            
            <Row label="EBT (Earnings Before Tax)" value={fmt(data.ebit - data.interest)} bold border />
            
            <Row label="Income Tax (20%)" value={`(${fmt(data.tax)})`} sub color="text-red-500" />
            
            <div className="mt-4 pt-2 border-t-2 border-black flex justify-between items-center bg-green-50 p-2 rounded">
                <span className="font-black text-lg text-pizza-dark">NET INCOME</span>
                <span className={`font-black text-lg ${data.netIncome >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {fmt(data.netIncome)}
                </span>
            </div>
          </div>
        )}

        {/* --- BALANCE SHEET --- */}
        {activeTab === FinancialStatementType.BALANCE && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-center mb-4 uppercase tracking-widest border-b-2 border-pizza-red pb-2">Balance Sheet</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* ASSETS */}
              <div>
                <h4 className="font-bold text-pizza-basil mb-2 border-b border-gray-300">ASSETS</h4>
                
                <h5 className="text-xs font-bold text-gray-500 uppercase mt-2 mb-1">Current Assets</h5>
                <Row label="Cash & Equivalents" value={fmt(data.assets.cash)} sub />
                <Row label="Accounts Receivable" value={fmt(data.assets.accountsReceivable)} sub />
                <Row label="Inventory" value={fmt(data.assets.inventory)} sub />
                <Row label="Prepaid Strategy Exp." value={fmt(data.assets.prepaidExpenses)} sub />
                <Row label="Total Current Assets" value={fmt(data.assets.cash + data.assets.accountsReceivable + data.assets.inventory + data.assets.prepaidExpenses)} bold border />

                <h5 className="text-xs font-bold text-gray-500 uppercase mt-4 mb-1">Non-Current Assets</h5>
                <Row label="Property, Plant & Equip." value={fmt(data.assets.equipment)} sub />
                <Row label="Accumulated Depreciation" value={`(${fmt(data.assets.accumulatedDepreciation)})`} sub color="text-gray-500" />
                <Row label="Net Fixed Assets" value={fmt(data.assets.equipment - data.assets.accumulatedDepreciation)} bold border />

                <div className="mt-4 pt-2 border-t-2 border-pizza-basil flex justify-between">
                    <span className="font-bold text-pizza-basil">TOTAL ASSETS</span>
                    <span className="font-bold text-pizza-basil">
                        {fmt(data.assets.cash + data.assets.accountsReceivable + data.assets.inventory + data.assets.prepaidExpenses + data.assets.equipment - data.assets.accumulatedDepreciation)}
                    </span>
                </div>
              </div>

              {/* LIABILITIES & EQUITY */}
              <div>
                <h4 className="font-bold text-pizza-red mb-2 border-b border-gray-300">LIABILITIES</h4>
                
                <h5 className="text-xs font-bold text-gray-500 uppercase mt-2 mb-1">Current Liabilities</h5>
                <Row label="Accounts Payable" value={fmt(data.liabilities.accountsPayable)} sub />
                <Row label="Accrued Expenses" value={fmt(data.liabilities.accruedExpenses)} sub />
                
                <h5 className="text-xs font-bold text-gray-500 uppercase mt-4 mb-1">Non-Current Liabilities</h5>
                <Row label="Long-term Debt" value={fmt(data.liabilities.loans)} sub />
                <Row label="Total Liabilities" value={fmt(data.liabilities.accountsPayable + data.liabilities.accruedExpenses + data.liabilities.loans)} bold border />

                <h4 className="font-bold text-blue-600 mb-2 mt-6 border-b border-gray-300">SHAREHOLDER'S EQUITY</h4>
                <Row label="Contributed Capital" value={fmt(data.equity.contributedCapital)} sub />
                <Row label="Retained Earnings" value={fmt(data.equity.retainedEarnings)} sub />
                <Row label="Total Equity" value={fmt(data.equity.contributedCapital + data.equity.retainedEarnings)} bold border />

                <div className="mt-4 pt-2 border-t-2 border-pizza-dark flex justify-between">
                    <span className="font-bold text-pizza-dark text-xs uppercase">Total Liab. & Equity</span>
                    <span className="font-bold text-pizza-dark">
                        {fmt(
                            data.liabilities.accountsPayable + data.liabilities.accruedExpenses + data.liabilities.loans + 
                            data.equity.contributedCapital + data.equity.retainedEarnings
                        )}
                    </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- CASH FLOW --- */}
        {activeTab === FinancialStatementType.CASH_FLOW && (
          <div className="space-y-4 animate-fadeIn max-w-lg mx-auto">
            <h3 className="text-lg font-bold text-center mb-6 uppercase tracking-widest border-b-2 border-pizza-red pb-2">Cash Flow Statement</h3>
            
            <div>
                <h4 className="font-bold text-gray-700 mb-2 bg-gray-100 p-1">Operating Activities</h4>
                <Row label="Net Income" value={fmt(data.netIncome)} bold />
                <Row label="Depreciation (Add-back)" value={`+${fmt(data.depreciation)}`} sub color="text-green-600" />
                <Row label="Amortization (Add-back)" value={`+${fmt(data.amortizationExpense)}`} sub color="text-green-600" />
                <Row label="Change in Accounts Rec." value={`(${fmt(data.revenue * 0.1)})`} sub color="text-red-500" />
                <Row label="Change in Inventory" value="(0)" sub />
                <Row label="Net Cash from Operations" value={fmt(data.netIncome + data.depreciation + data.amortizationExpense - (data.revenue * 0.1))} bold border />
            </div>

            <div className="mt-4">
                <h4 className="font-bold text-gray-700 mb-2 bg-gray-100 p-1">Investing Activities</h4>
                <Row 
                    label="Purchase of Equipment" 
                    value={data.capitalExpenditures > 0 ? `(${fmt(data.capitalExpenditures)})` : '(0)'} 
                    sub color={data.capitalExpenditures > 0 ? "text-red-500" : "text-gray-400"} 
                />
                <Row 
                    label="Strategy Payments (Deferred)" 
                    value={data.deferredStrategyCosts > 0 ? `(${fmt(data.deferredStrategyCosts)})` : '(0)'} 
                    sub color={data.deferredStrategyCosts > 0 ? "text-red-500" : "text-gray-400"} 
                />
                <Row 
                    label="Net Cash from Investing" 
                    value={`(${fmt(data.capitalExpenditures + data.deferredStrategyCosts)})`} 
                    bold border 
                />
            </div>

            <div className="mt-4">
                <h4 className="font-bold text-gray-700 mb-2 bg-gray-100 p-1">Financing Activities</h4>
                <Row label="Repayment of Loans" value="(0)" sub color="text-gray-400" />
                <Row label="Dividends Paid" value="(0)" sub color="text-gray-400" />
                <Row label="Net Cash from Financing" value="-" bold border />
            </div>

            <div className="mt-6 p-4 bg-gray-50 border-t-2 border-black">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-600">Net Increase in Cash</span>
                    <span className={`font-bold ${data.netIncome > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt((data.netIncome + data.depreciation + data.amortizationExpense - (data.revenue * 0.1)) - data.capitalExpenditures - data.deferredStrategyCosts)}
                    </span>
                </div>
                 <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Ending Cash Balance</span>
                    <span className="font-mono">{fmt(data.assets.cash)}</span>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialStatements;