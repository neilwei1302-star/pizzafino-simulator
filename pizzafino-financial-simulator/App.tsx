import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_STATE, STRATEGY_POOL, shuffleStrategies, createImpact } from './constants';
import { FinancialState, Strategy, HistoryData, GameLog } from './types';
import FinancialStatements from './components/FinancialStatements';
import EarningsModal from './components/EarningsModal';
import PizzeriaScene from './components/PizzeriaScene';
import { 
  Pizza, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  PlayCircle,
  PauseCircle,
  Clock,
  Hourglass,
  LineChart as ChartIcon,
  AlertTriangle,
  GripHorizontal,
  Dices,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<FinancialState>(INITIAL_STATE);
  const [month, setMonth] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [logs, setLogs] = useState<GameLog[]>([]);
  
  // Initial Stock Price Calculation
  const initialValuation = (INITIAL_STATE.revenue * 12 * 0.5) + (INITIAL_STATE.ebitda * 12 * 5);
  const initialStockPrice = Math.max(0.01, initialValuation / 100000);

  const [history, setHistory] = useState<HistoryData[]>([{
      month: 1, 
      revenue: INITIAL_STATE.revenue, 
      profit: INITIAL_STATE.netIncome,
      cash: INITIAL_STATE.cash,
      stockPrice: initialStockPrice
  }]);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  
  // Strategy Deck System
  const [strategyPool, setStrategyPool] = useState<Strategy[]>([]);
  const [activeDeck, setActiveDeck] = useState<Strategy[]>([]);
  const [executedStrategyIds, setExecutedStrategyIds] = useState<string[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  
  // Pending Strategies (Drag & Drop) removed

  
  // Investment History (For UI Lists)
  const [successHistory, setSuccessHistory] = useState<Strategy[]>([]);
  const [failureHistory, setFailureHistory] = useState<Strategy[]>([]);
  
  // Global Deck Cooldown (in seconds)
  const [globalDeckCooldown, setGlobalDeckCooldown] = useState(0);
  
  // Visual Feedback for Cash Change
  const [cashEffect, setCashEffect] = useState<{ val: number, id: number } | null>(null);

  const timerRef = useRef<number | null>(null);
  const earningsTimerRef = useRef<number | null>(null);

  // --- Helper: Pick a strategy based on current cash ---
  const pickNextStrategy = (currentPool: Strategy[], currentCash: number): Strategy | null => {
    if (currentPool.length === 0) return null;

    // 30% chance to force a Bad/Risky strategy to balance the deck
    if (Math.random() < 0.3) {
        const badOnes = currentPool.filter(s => s.quality === 'Bad' || s.type === 'Speculative');
        if (badOnes.length > 0) {
            const index = Math.floor(Math.random() * badOnes.length);
            return badOnes[index];
        }
    }

    // Dynamic Bucketing based on Player Cash
    // "Less money -> less expensive, More money -> more expensive"
    // "Keep average around 10,000" -> Don't make everything super expensive even if rich.

    const cheap = currentPool.filter(s => s.cost <= 10000);
    const moderate = currentPool.filter(s => s.cost > 10000 && s.cost <= 30000);
    const expensive = currentPool.filter(s => s.cost > 30000);

    let choicePool: Strategy[] = [];
    const roll = Math.random();

    if (currentCash < 15000) {
        // Poor: 70% Cheap, 20% Moderate, 10% Expensive
        if (roll < 0.7) choicePool = cheap;
        else if (roll < 0.9) choicePool = moderate;
        else choicePool = expensive;
    } else if (currentCash > 50000) {
        // Rich: 40% Expensive, 40% Moderate, 20% Cheap (Keeps average somewhat grounded)
        if (roll < 0.4) choicePool = expensive;
        else if (roll < 0.8) choicePool = moderate;
        else choicePool = cheap;
    } else {
        // Middle: Balanced (40% Cheap, 40% Moderate, 20% Expensive)
        if (roll < 0.4) choicePool = cheap;
        else if (roll < 0.8) choicePool = moderate;
        else choicePool = expensive;
    }

    // Fallback if bucket empty
    if (choicePool.length === 0) {
        // Try to find *something* affordable first
        const affordable = currentPool.filter(s => s.cost <= currentCash);
        if (affordable.length > 0) return affordable[Math.floor(Math.random() * affordable.length)];
        return currentPool[Math.floor(Math.random() * currentPool.length)];
    }

    const index = Math.floor(Math.random() * choicePool.length);
    return choicePool[index];
  };



  useEffect(() => {
    const allStrategies = shuffleStrategies(STRATEGY_POOL);
    const startingCash = INITIAL_STATE.cash;
    const initialDeck: Strategy[] = [];
    const pool = [...allStrategies];
    
    for(let i=0; i<5; i++) {
        const strat = pickNextStrategy(pool, startingCash);
        if (strat) {
            initialDeck.push(strat);
            const idx = pool.findIndex(p => p.id === strat.id);
            if (idx > -1) pool.splice(idx, 1);
        }
    }

    setActiveDeck(initialDeck);
    setStrategyPool(pool);
  }, []);

  // --- Earnings Report Timer ---
  useEffect(() => {
    if (isPlaying && !showEarningsModal) {
        if (earningsTimerRef.current) clearInterval(earningsTimerRef.current);
        earningsTimerRef.current = window.setInterval(() => {
            setIsPlaying(false);
            setShowEarningsModal(true);
        }, 180000); 
    } else {
        if (earningsTimerRef.current) clearInterval(earningsTimerRef.current);
    }
    return () => {
        if (earningsTimerRef.current) clearInterval(earningsTimerRef.current);
    };
  }, [isPlaying, showEarningsModal]);

  // --- Deck Cooldown Timer ---
  useEffect(() => {
    let interval: number;
    if (globalDeckCooldown > 0) {
        interval = window.setInterval(() => {
            setGlobalDeckCooldown((prev) => Math.max(0, prev - 1));
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [globalDeckCooldown]);

  const addLog = (message: string, type: 'info' | 'positive' | 'negative' = 'info') => {
    setLogs(prev => [{ month, message, type }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    if (isPlaying && !showEarningsModal) {
      timerRef.current = window.setInterval(() => {
        advanceMonth();
      }, 25000); 
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, showEarningsModal, month]);

  const advanceMonth = () => {
    setMonth((prevMonth) => {
      const nextMonth = prevMonth + 1;
      
      setGameState((prev) => {
        // --- 1. Operations Simulation ---
        const demandFlux = 0.95 + Math.random() * 0.10; 
        const actualOrders = Math.floor(prev.dailyOrders * 30 * demandFlux);
        
        const revenue = actualOrders * prev.averageOrderValue;
        const cogs = revenue * (prev.cogs / prev.revenue); 
        const grossProfit = revenue - cogs;
        const operatingExpenses = prev.operatingExpenses * (1 + (Math.random() * 0.02 - 0.01)); 
        
        const amortizationExpense = prev.deferredStrategyCosts * 0.35;
        const newDeferredCosts = prev.deferredStrategyCosts - amortizationExpense;

        const ebitda = grossProfit - operatingExpenses - amortizationExpense;
        const depreciation = prev.assets.equipment * 0.01; 
        const ebit = ebitda - depreciation;
        const interest = prev.liabilities.loans * 0.01;
        const ebt = ebit - interest;
        const tax = ebt > 0 ? ebt * 0.20 : 0;
        const netIncome = ebt - tax;

        const principalRepayment = prev.liabilities.loans * 0.005;
        const nextLoans = prev.liabilities.loans - principalRepayment;
        const apPayment = prev.liabilities.accountsPayable * 0.5;
        // Delay cash impact: 50% of COGS and 30% of OpEx are on credit (AP)
        const newApFromOps = (cogs * 0.5) + (operatingExpenses * 0.3);
        const nextAp = (prev.liabilities.accountsPayable - apPayment) + newApFromOps;
        const apDelta = nextAp - prev.liabilities.accountsPayable; 

        const operatingCashFlow = netIncome + depreciation + amortizationExpense; 
        const newRetainedEarnings = prev.equity.retainedEarnings + netIncome;
        
        const newAR = revenue * 0.1;
        const arDelta = newAR - prev.assets.accountsReceivable; 
        
        const targetInventory = cogs * 0.5;
        const newInventory = prev.assets.inventory > targetInventory 
            ? prev.assets.inventory - (cogs * 0.2) 
            : targetInventory;
            
        const inventoryDelta = newInventory - prev.assets.inventory; 

        const finalCash = prev.assets.cash + operatingCashFlow - arDelta - inventoryDelta + apDelta - principalRepayment;
        const newAccumDepreciation = prev.assets.accumulatedDepreciation + depreciation;

        const annualizedRevenue = revenue * 12;
        const annualizedEbitda = ebitda * 12;
        const netDebt = nextLoans - finalCash;
        let enterpriseValue = (annualizedRevenue * 0.5) + (annualizedEbitda * 5);
        if (enterpriseValue < 0) enterpriseValue = 0; 

        const equityValue = enterpriseValue - netDebt;
        let newStockPrice = Math.max(0.01, equityValue / 100000);

        const nextState: FinancialState = {
          ...prev,
          cash: finalCash,
          revenue,
          cogs,
          grossProfit,
          operatingExpenses,
          deferredStrategyCosts: newDeferredCosts,
          amortizationExpense,
          oneTimeExpenses: 0,
          capitalExpenditures: 0,
          cashFlowFromInvesting: 0, // Reset monthly
          cashFlowFromFinancing: 0, // Reset monthly
          ebitda,
          depreciation,
          ebit,
          interest,
          tax,
          netIncome,
          assets: {
            ...prev.assets,
            cash: finalCash,
            inventory: newInventory,
            accountsReceivable: newAR,
            accumulatedDepreciation: newAccumDepreciation,
            prepaidExpenses: newDeferredCosts, 
            equipment: prev.assets.equipment 
          },
          equity: {
            ...prev.equity,
            retainedEarnings: newRetainedEarnings
          },
          liabilities: {
            ...prev.liabilities,
            accountsPayable: nextAp,
            loans: nextLoans
          }
        };

        const newDataPoint = {
            month: nextMonth,
            revenue,
            profit: netIncome,
            cash: finalCash,
            stockPrice: newStockPrice
        };
        setHistory(h => [...h, newDataPoint]);

        return nextState;
      });
      
      setCooldowns(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(key => {
            if (next[key] > 0) next[key] -= 1;
        });
        return next;
      });

      return nextMonth;
    });
  };

  // --- CLICK: Execute Strategy ---
  const replaceStrategyInDeck = (oldStrategyId: string, currentCash: number) => {
    const currentDeck = activeDeck.filter(s => s.id !== oldStrategyId);

    if (strategyPool.length > 0) {
        const nextStrategy = pickNextStrategy(strategyPool, currentCash);
        
        if (nextStrategy) {
            const newPool = strategyPool.filter(s => s.id !== nextStrategy.id);
            setStrategyPool(newPool);
            setActiveDeck([...currentDeck, nextStrategy]);
        } else {
             setActiveDeck(currentDeck);
        }
    } else {
        setActiveDeck(currentDeck);
    }
  };

  const handleStrategyClick = (strategy: Strategy) => {
    if (globalDeckCooldown > 0) return; 

    // Check cash
    if (strategy.cost > 0 && gameState.assets.cash < strategy.cost) {
      addLog(`Not enough cash to execute ${strategy.title}`, 'negative');
      return;
    }

    // SYSTEM CALCULATES OUTCOME
    const successRate = strategy.successRate ?? 1.0;
    const roll = Math.random();
    const isSuccess = roll <= successRate;
    
    // VISUAL FEEDBACK FOR CASH
    if (strategy.cost !== 0) {
        setCashEffect({ val: -strategy.cost, id: Math.random() });
        setTimeout(() => setCashEffect(null), 2000);
    }

    if (isSuccess) {
        setGameState(prev => strategy.impact(prev));
        setExecutedStrategyIds(prev => [...prev, strategy.id]);
        
        if (strategy.quality === 'Bad') {
            setFailureHistory(prev => [strategy, ...prev]);
            addLog(`EXECUTED: ${strategy.title}. ${strategy.successLog || '(Bad Investment)'}`, 'negative');
        } else {
            setSuccessHistory(prev => [strategy, ...prev]);
            addLog(`SUCCESS: ${strategy.title}! ${strategy.successLog || ''}`, 'positive');
        }
    } else {
        if (strategy.failureImpact) {
            setGameState(prev => strategy.failureImpact!(prev));
        } else {
            // Default Failure: Pay cost, get damage
            const defaultFail = createImpact(strategy.cost, (s) => ({
                 customerSatisfaction: Math.max(0, s.customerSatisfaction - 5),
                 oneTimeExpenses: s.oneTimeExpenses + 500
            }));
            setGameState(prev => defaultFail(prev));
        }
        setFailureHistory(prev => [strategy, ...prev]);
        addLog(`FAILED: ${strategy.title}. ${strategy.failureLog || 'Investment failed.'}`, 'negative');
    }

    // Replace in deck
    replaceStrategyInDeck(strategy.id, gameState.assets.cash);
    setGlobalDeckCooldown(5);
  };



  const handleStrategyDismiss = (strategy: Strategy) => {
      // Remove from deck and replace immediately
      replaceStrategyInDeck(strategy.id, gameState.assets.cash);
      addLog(`Dismissed: ${strategy.title}`, 'info');
  };

  const togglePause = () => setIsPlaying(!isPlaying);

  const currentStockPrice = history[history.length - 1]?.stockPrice || 0;
  const previousStockPrice = history[history.length - 2]?.stockPrice || currentStockPrice;
  const isStockUp = currentStockPrice >= previousStockPrice;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      <header className="bg-pizza-red text-white p-4 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-white p-2 rounded-full">
              <Pizza className="text-pizza-red w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display leading-none">PizzaFino</h1>
              <span className="text-xs opacity-80 uppercase tracking-widest font-semibold">Financial Sim</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-4 py-1 rounded-lg bg-black/20">
                <ChartIcon className="w-4 h-4 text-white" />
                <span className="text-xs uppercase font-bold text-white/70 mr-1">Ticker: PZZ</span>
                <span className={`font-mono font-bold ${isStockUp ? 'text-green-300' : 'text-red-300'}`}>
                    ${currentStockPrice.toFixed(2)}
                </span>
                {isStockUp ? <TrendingUp className="w-3 h-3 text-green-300" /> : <TrendingUp className="w-3 h-3 text-red-300 rotate-180" />}
            </div>

            <div className="flex items-center gap-2 bg-pizza-red/80 px-4 py-1 rounded-lg border border-red-400">
              <Calendar className="w-5 h-5" />
              <span className="font-bold">Month {month}</span>
            </div>
            <div className="relative flex items-center gap-2 bg-white text-pizza-dark px-4 py-1 rounded-lg font-mono font-bold shadow-inner">
               <DollarSign className="w-4 h-4 text-green-600" />
               {gameState.assets.cash.toLocaleString(undefined, { maximumFractionDigits: 0 })}
               
               {/* Cash Change Floating Animation */}
               {cashEffect && (
                   <div 
                      key={cashEffect.id}
                      className={`absolute -bottom-8 right-0 font-bold text-sm animate-bounce px-2 py-1 rounded bg-white shadow-md border ${cashEffect.val > 0 ? 'text-green-600 border-green-200' : 'text-red-600 border-red-200'}`}
                   >
                       {cashEffect.val > 0 ? '+' : ''}{cashEffect.val.toLocaleString()}
                   </div>
               )}
            </div>
            <button 
              onClick={togglePause}
              className="hover:scale-110 transition-transform"
            >
              {isPlaying ? <PauseCircle className="w-8 h-8" /> : <PlayCircle className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DECK & LOGS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col max-h-[600px] relative">
            
            {/* Cooldown Overlay */}
            {globalDeckCooldown > 0 && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6 animate-fadeIn">
                    <div className="bg-gray-100 p-4 rounded-full mb-3">
                        <Hourglass className="w-8 h-8 text-gray-400 animate-pulse" />
                    </div>
                    <div className="text-3xl font-bold text-gray-600 mb-1">{globalDeckCooldown}s</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Market Cooldown</div>
                </div>
            )}

            <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center">
              <span className="flex items-center gap-2">
                Strategy Deck 
                <span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{strategyPool.length} left</span>
              </span>
              <span className="text-xs font-normal bg-gray-200 px-2 py-1 rounded text-gray-600">Click to Execute</span>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
              {activeDeck.length === 0 && (
                <div className="text-center p-8 text-gray-400 italic">Deck is empty!</div>
              )}
              {activeDeck.map(strat => {
                 const canAfford = strat.cost < 0 || gameState.assets.cash >= strat.cost;
                 const isRisky = (strat.successRate || 1) < 1;
                 
                 return (
                  <div key={strat.id} className="relative group">
                   <button
                    onClick={() => handleStrategyClick(strat)}
                    disabled={!canAfford || globalDeckCooldown > 0}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all relative
                      ${canAfford
                          ? (isRisky ? 'bg-orange-50 border-orange-200 hover:border-orange-400 hover:shadow-md hover:-translate-y-1' : 'bg-white border-gray-100 hover:border-pizza-cheese hover:shadow-md hover:-translate-y-1')
                          : 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed grayscale'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-sm leading-tight pr-2 text-gray-900">{strat.title}</span>
                      <div className="flex gap-1">
                        {isRisky && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap bg-red-100 text-red-700 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {Math.round((1 - (strat.successRate || 1)) * 100)}%
                            </span>
                        )}
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                            strat.type === 'Revenue' ? 'bg-blue-100 text-blue-700' :
                            strat.type === 'Profit' ? 'bg-green-100 text-green-700' : 
                            strat.type === 'Speculative' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                        }`}>{strat.type}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2 leading-tight min-h-[2.5em]">{strat.description}</p>
                    <div className="flex justify-between items-center text-xs border-t pt-2 border-dashed border-gray-200">
                      <span className={`font-mono font-bold ${canAfford ? (strat.cost < 0 ? 'text-green-600' : 'text-gray-700') : 'text-red-500'}`}>
                          {strat.cost < 0 ? `+${Math.abs(strat.cost).toLocaleString()} (Loan)` : `$${strat.cost.toLocaleString()}`}
                      </span>
                      <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                         {strat.cost < 0 ? 'Cash Inflow' : 'One-Time Setup'}
                      </span>
                    </div>
                  </button>
                    {/* Delete Button */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleStrategyDismiss(strat);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-sm border border-transparent hover:border-red-200"
                        title="Dismiss Strategy"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                   </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md flex-1 min-h-[200px] flex flex-col">
            <div className="p-3 border-b text-sm font-bold text-gray-600">Activity Log</div>
            <div className="p-3 overflow-y-auto flex-1 space-y-2 text-sm custom-scrollbar">
              {logs.length === 0 && <span className="text-gray-400 italic">No activity yet.</span>}
              {logs.map((log, idx) => (
                <div key={idx} className="flex gap-2 items-start animate-fadeIn">
                  <span className="text-xs text-gray-400 font-mono mt-0.5">M{log.month}</span>
                  <span className={`${
                    log.type === 'positive' ? 'text-green-600' : 
                    log.type === 'negative' ? 'text-red-600 font-bold' : 'text-gray-600'
                  }`}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SCENE + STATS */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* SCENE */}
             <div className="bg-white rounded-xl shadow-md overflow-hidden relative min-h-[300px]">
                <PizzeriaScene 
                    dailyOrders={gameState.dailyOrders} 
                    activeStrategyIds={executedStrategyIds} 
                    satisfaction={gameState.customerSatisfaction}
                />
             </div>
             
             {/* HISTORY LISTS */}
             <div className="flex flex-col gap-4 h-full min-h-[300px]">
                <div className="grid grid-cols-1 gap-4 h-full">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100 overflow-hidden flex flex-col h-full">
                        <div className="text-xs font-bold text-green-700 uppercase mb-2 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Good Investments
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {successHistory.length === 0 && <span className="text-xs text-green-400 italic">None yet...</span>}
                            {successHistory.map((s, i) => (
                                <div key={i} className="text-xs text-green-800 border-b border-green-100 pb-1 last:border-0 flex justify-between">
                                    <span>{s.title}</span>
                                    <span className="font-mono opacity-70">-${s.cost.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100 overflow-hidden flex flex-col h-full">
                        <div className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Bad Investments
                        </div>
                         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                            {failureHistory.length === 0 && <span className="text-xs text-red-400 italic">None yet...</span>}
                            {failureHistory.map((s, i) => (
                                <div key={i} className="text-xs text-red-800 border-b border-red-100 pb-1 last:border-0 flex justify-between">
                                    <span>{s.title}</span>
                                    <span className="font-mono opacity-70">-${s.cost.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-blue-500">
                <div className="text-xs text-gray-500 uppercase font-bold">Revenue/mo</div>
                <div className="text-2xl font-bold text-gray-800">${Math.floor(gameState.revenue).toLocaleString()}</div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-green-500">
                <div className="text-xs text-gray-500 uppercase font-bold">Net Profit</div>
                <div className={`text-2xl font-bold ${gameState.netIncome >= 0 ? 'text-gray-800' : 'text-red-500'}`}>
                  ${Math.floor(gameState.netIncome).toLocaleString()}
                </div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-yellow-500">
                <div className="text-xs text-gray-500 uppercase font-bold">Operating Margin</div>
                <div className="text-2xl font-bold text-gray-800">{gameState.revenue > 0 ? ((gameState.ebit / gameState.revenue) * 100).toFixed(1) : '0.0'}%</div>
             </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border-b-4 border-purple-500">
                <div className="text-xs text-gray-500 uppercase font-bold">Satisfaction</div>
                <div className="text-2xl font-bold text-gray-800">{Math.round(gameState.customerSatisfaction)}%</div>
             </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-md h-72">
            <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Market Performance</span>
              <span className="text-xs font-normal text-gray-400">Left Axis: Financials | Right Axis: Stock Price</span>
            </h3>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} tickFormatter={(val) => `M${val}`} />
                <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} tickFormatter={(val) => `$${val/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#8884d8" fontSize={12} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number, name: string) => {
                      if (name === 'Stock Price') return [`$${value.toFixed(2)}`, name];
                      return [`$${value.toLocaleString()}`, name];
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={false} name="Revenue" />
                <Line yAxisId="left" type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} name="Profit" />
                <Line yAxisId="right" type="monotone" dataKey="stockPrice" stroke="#8b5cf6" strokeWidth={3} dot={false} name="Stock Price" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex-1 min-h-[400px]">
            <FinancialStatements data={gameState} />
          </div>
        </div>
      </main>

      <EarningsModal 
        isOpen={showEarningsModal} 
        month={month} 
        financials={gameState} 
        history={history}
        onClose={() => {
            setShowEarningsModal(false);
            setIsPlaying(true);
        }} 
      />
    </div>
  );
};

export default App;