import { GoogleGenAI } from "@google/genai";
import { FinancialState, HistoryData } from '../types';

const getClient = () => {
    // Ensuring API Key is present. The app will fail gracefully in UI if not, 
    // but here we instantiate the client.
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInvestorFeedback = async (
  month: number,
  financials: FinancialState,
  history: HistoryData[]
): Promise<{ feedback: string; rating: string; score: number }> => {
  try {
    const ai = getClient();
    
    // Calculate cumulative stats
    // Filter out intermediate ticks (fractional months) to avoid double counting
    const completedMonths = history.filter(h => Number.isInteger(h.month));
    const totalRevenue = completedMonths.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalProfit = completedMonths.reduce((acc, curr) => acc + curr.profit, 0);
    const currentStockPrice = history[history.length - 1]?.stockPrice || 0;
    
    // Quarterly Stats
    const reportingPeriod = completedMonths.slice(-3);
    const qRevenue = reportingPeriod.reduce((acc, curr) => acc + curr.revenue, 0);
    const qProfit = reportingPeriod.reduce((acc, curr) => acc + curr.profit, 0);

    const prompt = `
      You are a brutal, cynical, and hard-to-please Wall Street Equity Analyst covering "PizzaFino".
      It is Month ${month} of operations.
      
      MARKET CONTEXT:
      The restaurant sector is crowded. Margins are usually thin. Investors are impatient.
      
      FINANCIALS (LIFETIME):
      - Cumulative Revenue: $${totalRevenue.toLocaleString()}
      - Cumulative Net Income (Profit/Loss): $${totalProfit.toLocaleString()}
      - Current Cash: $${financials.cash.toLocaleString()}
      - Current Stock Price: $${currentStockPrice.toFixed(2)}
      - Total Debt (Loans): $${financials.liabilities.loans.toLocaleString()}
      
      LATEST QUARTER (Last 3 Months):
      - Revenue: $${qRevenue.toLocaleString()}
      - Profit: $${qProfit.toLocaleString()}
      - Margin: ${((qProfit / qRevenue) * 100).toFixed(1)}% (Industry avg is 10-15%)
      - Satisfaction: ${Math.round(financials.customerSatisfaction)}/100

      TASK:
      Provide a brutal, "not too nice" assessment. Do not sugarcoat anything. If they are losing money, tell them they are incompetent. If they are profitable, question if it's sustainable.
      
      STRICT RATING RULES:
      - "Strong Buy": ONLY if Net Margin > 20% AND Satisfaction > 90 AND Debt is low. (Extremely Rare)
      - "Buy": Solid profit growth and safe cash levels.
      - "Hold": Profitable but stagnant, or growing revenue but losing money.
      - "Sell": Losing money, high debt, or dangerously low cash.
      - "Strong Sell": Insolvency risk or consistent heavy losses.
      
      Return ONLY valid JSON:
      {
        "feedback": "Short, punchy paragraph (max 60 words). Use financial jargon (burn rate, EBITDA, leverage). Be mean.",
        "rating": "Hold",
        "score": 55
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      feedback: "Analyst call disconnected. Market uncertainty remains high regarding your solvency.",
      rating: "Hold",
      score: 50
    };
  }
};
