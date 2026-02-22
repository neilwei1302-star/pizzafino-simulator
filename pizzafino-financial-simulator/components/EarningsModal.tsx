import React, { useState, useEffect, useRef } from 'react';
import { generateInvestorFeedback } from '../services/geminiService';
import { FinancialState, HistoryData } from '../types';
import { Loader2, TrendingUp, TrendingDown, Briefcase, DollarSign, PieChart, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Props {
  month: number;
  financials: FinancialState;
  history: HistoryData[];
  onClose: () => void;
  isOpen: boolean;
}

interface DraggableItem {
  id: string;
  label: string;
  value: number;
  category: 'income' | 'balance';
}

interface DropZone {
  id: string;
  label: string;
  expectedValue: number;
  currentValue?: number;
  isCorrect: boolean;
  category: 'income' | 'balance' | 'cashflow';
}

const EarningsModal: React.FC<Props> = ({ month, financials, history, onClose, isOpen }) => {
  const [items, setItems] = useState<DraggableItem[]>([]);
  const [zones, setZones] = useState<DropZone[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggableItem | null>(null);
  const [feedbackData, setFeedbackData] = useState<{ feedback: string; rating: string; score: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [shakeZone, setShakeZone] = useState<string | null>(null);

  // Initialize Game
  useEffect(() => {
    if (isOpen) {
        setFeedbackData(null);
        setIsAnalyzing(false);
        
        // Calculate splits for difficulty
        const wages = Math.floor(financials.operatingExpenses * 0.55);
        const overhead = financials.operatingExpenses - wages;
        const operatingCashFlow = financials.netIncome + financials.depreciation;

        // Create Draggable Items (Scrambled & Obscured)
        const newItems: DraggableItem[] = [
            { id: 'rev', label: 'POS Sales Report', value: financials.revenue, category: 'income' },
            { id: 'cogs', label: 'Sysco Ingredient Invoices', value: financials.cogs, category: 'income' },
            { id: 'wages', label: 'Staff Payroll & Benefits', value: wages, category: 'income' },
            { id: 'overhead', label: 'Rent, Utilities & Insurance', value: overhead, category: 'income' },
            { id: 'depr', label: 'Equipment Wear & Tear', value: financials.depreciation, category: 'income' },
            { id: 'interest', label: 'Bank Loan Interest', value: financials.interest, category: 'income' },
            { id: 'tax', label: 'Income Tax Provision', value: financials.tax, category: 'income' },
            
            { id: 'cash', label: 'Bank Account Balance', value: financials.assets.cash, category: 'balance' },
            { id: 'inventory', label: 'Warehouse Stock Count', value: financials.assets.inventory, category: 'balance' },
            { id: 'debt', label: 'Outstanding Principal', value: financials.liabilities.loans, category: 'balance' },
            
            { id: 'ocf', label: 'Net Cash from Ops', value: operatingCashFlow, category: 'cashflow' },
            { id: 'icf', label: 'CapEx & Investments', value: financials.cashFlowFromInvesting, category: 'cashflow' },
            { id: 'fcf', label: 'Stock & Loan Activities', value: financials.cashFlowFromFinancing, category: 'cashflow' },
        ].sort(() => Math.random() - 0.5);
        
        setItems(newItems);

        // Create Drop Zones
        setZones([
            // Income Statement
            { id: 'z_rev', label: 'Total Revenue', expectedValue: financials.revenue, isCorrect: false, category: 'income' },
            { id: 'z_cogs', label: 'Cost of Goods Sold', expectedValue: financials.cogs, isCorrect: false, category: 'income' },
            { id: 'z_wages', label: 'Wages & Salaries', expectedValue: wages, isCorrect: false, category: 'income' },
            { id: 'z_overhead', label: 'Rent & Overhead', expectedValue: overhead, isCorrect: false, category: 'income' },
            { id: 'z_depr', label: 'Depreciation', expectedValue: financials.depreciation, isCorrect: false, category: 'income' },
            { id: 'z_interest', label: 'Interest Expense', expectedValue: financials.interest, isCorrect: false, category: 'income' },
            { id: 'z_tax', label: 'Taxes', expectedValue: financials.tax, isCorrect: false, category: 'income' },

            // Balance Sheet
            { id: 'z_cash', label: 'Cash & Equivalents', expectedValue: financials.assets.cash, isCorrect: false, category: 'balance' },
            { id: 'z_inventory', label: 'Inventory Assets', expectedValue: financials.assets.inventory, isCorrect: false, category: 'balance' },
            { id: 'z_debt', label: 'Long-Term Debt', expectedValue: financials.liabilities.loans, isCorrect: false, category: 'balance' },

            // Cash Flow
            { id: 'z_ocf', label: 'Operating Cash Flow', expectedValue: operatingCashFlow, isCorrect: false, category: 'cashflow' },
            { id: 'z_icf', label: 'Investing Cash Flow', expectedValue: financials.cashFlowFromInvesting, isCorrect: false, category: 'cashflow' },
            { id: 'z_fcf', label: 'Financing Cash Flow', expectedValue: financials.cashFlowFromFinancing, isCorrect: false, category: 'cashflow' },
        ]);
    }
  }, [isOpen, financials]);

  // Check for Completion
  useEffect(() => {
    const allCorrect = zones.length > 0 && zones.every(z => z.isCorrect);
    if (allCorrect && !isAnalyzing && !feedbackData) {
        handleCompletion();
    }
  }, [zones, isAnalyzing, feedbackData]);

  const handleCompletion = async () => {
    setIsAnalyzing(true);
    // Add a small delay for dramatic effect
    await new Promise(r => setTimeout(r, 1500));
    
    const result = await generateInvestorFeedback(month, financials, history);
    setFeedbackData(result);
    setIsAnalyzing(false);
  };

  const handleDragStart = (e: React.DragEvent, item: DraggableItem) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, zoneId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const zone = zones.find(z => z.id === zoneId);
    if (!zone || zone.isCorrect) return;

    // Check Correctness
    if (Math.abs(draggedItem.value - zone.expectedValue) < 0.01) {
        // Correct!
        setZones(prev => prev.map(z => 
            z.id === zoneId ? { ...z, isCorrect: true, currentValue: draggedItem.value } : z
        ));
        setItems(prev => prev.filter(i => i.id !== draggedItem.id));
    } else {
        // Incorrect!
        setShakeZone(zoneId);
        setTimeout(() => setShakeZone(null), 500);
    }
    setDraggedItem(null);
  };

  if (!isOpen) return null;

  const getRatingColor = (r: string) => {
      if (r.includes('Strong Buy')) return 'text-emerald-600 border-emerald-600 bg-emerald-50';
      if (r.includes('Buy')) return 'text-green-600 border-green-600 bg-green-50';
      if (r.includes('Hold')) return 'text-yellow-600 border-yellow-600 bg-yellow-50';
      if (r.includes('Sell')) return 'text-orange-600 border-orange-600 bg-orange-50';
      return 'text-red-600 border-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 flex justify-between items-center border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-pizza-red" />
                Quarterly Earnings Call
            </h2>
            <p className="text-gray-400 text-sm mt-1">
                {feedbackData ? "Analyst Report Received" : "Task: File your financial statements correctly to proceed."}
            </p>
          </div>
          <div className="text-right">
             <div className="text-xs text-gray-500 uppercase font-bold">Reporting Period</div>
             <div className="text-xl font-mono font-bold">Month {month}</div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* LEFT: Draggable Items Pool (Only show if not done) */}
            {!feedbackData && (
                <div className="w-full md:w-1/3 bg-gray-50 p-6 border-r border-gray-200 overflow-y-auto">
                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4" /> Unfiled Expenses
                    </h3>
                    <div className="space-y-3">
                        {items.length === 0 && !isAnalyzing && (
                            <div className="text-center text-green-600 font-bold py-8 animate-pulse">
                                All items filed! Analyzing...
                            </div>
                        )}
                        {items.map(item => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item)}
                                className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-400 transition-all group"
                            >
                                <div className="text-xs text-gray-400 uppercase font-bold mb-1">{item.category === 'income' ? 'Income Stmt' : 'Balance Sheet'}</div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-700">{item.label}</span>
                                    <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        ${Math.round(item.value).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Instructions */}
                    <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                        <p className="font-bold mb-1">Instructions:</p>
                        <p>Drag the financial figures above into their correct slots on the statements to the right.</p>
                    </div>
                </div>
            )}

            {/* RIGHT: Drop Zones / Result */}
            <div className="flex-1 p-6 overflow-y-auto bg-white relative">
                
                {isAnalyzing && (
                    <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-gray-800">Connecting to Wall Street...</h3>
                        <p className="text-gray-500">Analysts are crunching your numbers.</p>
                    </div>
                )}

                {feedbackData ? (
                    <div className="max-w-2xl mx-auto animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="text-sm text-gray-500 uppercase font-bold mb-2">Investor Rating</div>
                            <div className={`text-5xl font-black tracking-tighter inline-block px-6 py-2 rounded-2xl border-4 ${getRatingColor(feedbackData.rating)}`}>
                                {feedbackData.rating.toUpperCase()}
                            </div>
                            <div className="mt-4 text-gray-400 font-mono text-sm">Score: {feedbackData.score}/100</div>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200 relative mb-8">
                            <div className="absolute -top-3 left-8 bg-white px-2 text-4xl text-gray-300">“</div>
                            <p className="text-xl text-gray-800 font-serif leading-relaxed italic text-center">
                                {feedbackData.feedback}
                            </p>
                            <div className="absolute -bottom-8 right-8 bg-white px-2 text-4xl text-gray-300">”</div>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black hover:scale-105 transition-all shadow-lg"
                            >
                                Accept Fate & Continue
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Income Statement Zone */}
                        <div className="border-2 border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                            <h3 className="text-md font-bold text-gray-800 border-b pb-2 mb-4 flex justify-between">
                                <span>Income Statement</span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">P&L</span>
                            </h3>
                            <div className="space-y-3">
                                {['z_rev', 'z_cogs', 'z_wages', 'z_overhead', 'z_depr', 'z_interest', 'z_tax'].map(id => {
                                    const zone = zones.find(z => z.id === id);
                                    if (!zone) return null;
                                    return (
                                        <div 
                                            key={id}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, id)}
                                            className={`
                                                flex justify-between items-center p-3 rounded-lg border-2 border-dashed transition-all text-sm
                                                ${zone.isCorrect 
                                                    ? 'bg-green-50 border-green-200 border-solid' 
                                                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                                }
                                                ${shakeZone === id ? 'animate-shake border-red-400 bg-red-50' : ''}
                                            `}
                                        >
                                            <span className="font-bold text-gray-600 truncate mr-2">{zone.label}</span>
                                            {zone.isCorrect ? (
                                                <span className="font-mono font-bold text-green-700 flex items-center gap-1 text-xs">
                                                    ${Math.round(zone.expectedValue).toLocaleString()}
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Drop here...</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Balance Sheet Zone */}
                        <div className="border-2 border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                            <h3 className="text-md font-bold text-gray-800 border-b pb-2 mb-4 flex justify-between">
                                <span>Balance Sheet</span>
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Assets/Liab</span>
                            </h3>
                            <div className="space-y-3">
                                {['z_cash', 'z_inventory', 'z_debt'].map(id => {
                                    const zone = zones.find(z => z.id === id);
                                    if (!zone) return null;
                                    return (
                                        <div 
                                            key={id}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, id)}
                                            className={`
                                                flex justify-between items-center p-3 rounded-lg border-2 border-dashed transition-all text-sm
                                                ${zone.isCorrect 
                                                    ? 'bg-green-50 border-green-200 border-solid' 
                                                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                                }
                                                ${shakeZone === id ? 'animate-shake border-red-400 bg-red-50' : ''}
                                            `}
                                        >
                                            <span className="font-bold text-gray-600 truncate mr-2">{zone.label}</span>
                                            {zone.isCorrect ? (
                                                <span className="font-mono font-bold text-green-700 flex items-center gap-1 text-xs">
                                                    ${Math.round(zone.expectedValue).toLocaleString()}
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Drop here...</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cash Flow Zone */}
                        <div className="border-2 border-gray-100 rounded-xl p-4 bg-white shadow-sm">
                            <h3 className="text-md font-bold text-gray-800 border-b pb-2 mb-4 flex justify-between">
                                <span>Cash Flow</span>
                                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Liquidity</span>
                            </h3>
                            <div className="space-y-3">
                                {['z_ocf', 'z_icf', 'z_fcf'].map(id => {
                                    const zone = zones.find(z => z.id === id);
                                    if (!zone) return null;
                                    return (
                                        <div 
                                            key={id}
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, id)}
                                            className={`
                                                flex justify-between items-center p-3 rounded-lg border-2 border-dashed transition-all text-sm
                                                ${zone.isCorrect 
                                                    ? 'bg-green-50 border-green-200 border-solid' 
                                                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                                }
                                                ${shakeZone === id ? 'animate-shake border-red-400 bg-red-50' : ''}
                                            `}
                                        >
                                            <span className="font-bold text-gray-600 truncate mr-2">{zone.label}</span>
                                            {zone.isCorrect ? (
                                                <span className="font-mono font-bold text-green-700 flex items-center gap-1 text-xs">
                                                    ${Math.round(zone.expectedValue).toLocaleString()}
                                                    <CheckCircle2 className="w-3 h-3" />
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Drop here...</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsModal;
