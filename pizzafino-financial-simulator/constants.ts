import { FinancialState, Strategy } from './types';

export const INITIAL_STATE: FinancialState = {
  cash: 75000, 
  revenue: 42000, 
  cogs: 13440, // 32% COGS
  grossProfit: 28560,
  operatingExpenses: 26500, // High OpEx
  
  deferredStrategyCosts: 0,
  amortizationExpense: 0,
  oneTimeExpenses: 0,
  
  capitalExpenditures: 0,
  cashFlowFromInvesting: 0,
  cashFlowFromFinancing: 0,
  ebitda: 2060, // Slim margins
  depreciation: 1200,
  ebit: 860,
  interest: 300,
  tax: 112,
  netIncome: 448,
  
  assets: {
    cash: 75000,
    accountsReceivable: 4200, 
    inventory: 5000,
    prepaidExpenses: 0,
    equipment: 120000, 
    accumulatedDepreciation: 0,
  },
  liabilities: {
    accountsPayable: 6000,
    accruedExpenses: 2000,
    loans: 60000,
  },
  equity: {
    contributedCapital: 110000,
    retainedEarnings: 26200, 
    sharesOutstanding: 100000,
  },
  
  customerSatisfaction: 70,
  dailyOrders: 70, 
  averageOrderValue: 20, 
};

// --- Helper for Immutability ---
export const createImpact = (
  cost: number, 
  updates: Partial<FinancialState> | ((s: FinancialState) => Partial<FinancialState>),
  assetUpdate?: Partial<FinancialState['assets']>,
  liabilityUpdate?: Partial<FinancialState['liabilities']>,
  equityUpdate?: Partial<FinancialState['equity']>
) => (state: FinancialState): FinancialState => {
  const specificUpdates = typeof updates === 'function' ? updates(state) : updates;
  const isCapEx = assetUpdate && 'equipment' in assetUpdate;

  const newAssets = { ...state.assets };
  newAssets.cash -= cost;

  if (!isCapEx && cost > 0) newAssets.prepaidExpenses += cost;

  if (assetUpdate) {
    (Object.keys(assetUpdate) as Array<keyof typeof assetUpdate>).forEach(key => {
       const val = assetUpdate[key];
       if (typeof val === 'number') newAssets[key] = (newAssets[key] || 0) + val;
    });
  }

  const newLiabilities = { ...state.liabilities };
  if (liabilityUpdate) {
    (Object.keys(liabilityUpdate) as Array<keyof typeof liabilityUpdate>).forEach(key => {
        const val = liabilityUpdate[key];
        if (typeof val === 'number') newLiabilities[key] = (newLiabilities[key] || 0) + val;
    });
  }

  const newEquity = { ...state.equity };
  if (equityUpdate) {
    (Object.keys(equityUpdate) as Array<keyof typeof equityUpdate>).forEach(key => {
        const val = equityUpdate[key];
        if (typeof val === 'number') newEquity[key] = (newEquity[key] || 0) + val;
    });
  }

  // Calculate Cash Flows
  // Investing CF: -CapEx
  const investingFlow = isCapEx ? -cost : 0;
  
  // Financing CF: +Loans, -LoanRepayment, +StockIssuance
  let financingFlow = 0;
  if (liabilityUpdate && 'loans' in liabilityUpdate) {
      financingFlow += liabilityUpdate.loans || 0;
  }
  if (equityUpdate && 'contributedCapital' in equityUpdate) {
      financingFlow += equityUpdate.contributedCapital || 0; // Cash from stock
  }

  let newState = {
    ...state,
    ...specificUpdates,
    capitalExpenditures: isCapEx ? state.capitalExpenditures + cost : state.capitalExpenditures,
    cashFlowFromInvesting: state.cashFlowFromInvesting + investingFlow,
    cashFlowFromFinancing: state.cashFlowFromFinancing + financingFlow,
    deferredStrategyCosts: (!isCapEx && cost > 0) ? state.deferredStrategyCosts + cost : state.deferredStrategyCosts,
    assets: newAssets,
    liabilities: newLiabilities,
    equity: newEquity
  };
  
  newState.cash = newState.assets.cash;
  return newState;
};

// --- CORE STRATEGIES (1-100) ---
const CORE_STRATEGIES_DATA = [
    // 1. Store Location & Customer Traffic
    { id: 1, title: "Lease Premium Corner Unit", desc: "Lease a premium corner unit near a bustling corporate office park.", cost: 22000, effect: "Good", rationale: "High visibility; easily captures the lucrative midday lunch rush.", type: "Revenue" },
    { id: 2, title: "Lease Next to Mega-Gym", desc: "Sign a lease right next door to a massive, popular mega-gym.", cost: 15000, effect: "Bad", rationale: "Mismatch Intent: High foot traffic, but exhausted people rarely want heavy pizza.", type: "Revenue" },
    { id: 3, title: "Mall Food Court Kiosk", desc: "Kiosk inside a highly trafficked shopping mall food court.", cost: 15000, effect: "Good", rationale: "Built-in foot traffic with a captive, hungry audience.", type: "Revenue" },
    { id: 4, title: "Highway Billboard", desc: "Buy a billboard on the busiest interstate highway in the state.", cost: 12000, effect: "Bad", rationale: "Proximity Disconnect: Drivers won't exit a highway and drive 20 miles for a slice.", type: "Revenue" },
    { id: 5, title: "Stadium Sponsorship", desc: "Sponsor a local high school sports stadium with banner ads.", cost: 8000, effect: "Good", rationale: "Drives consistent local family traffic after weekly games.", type: "Revenue" },
    { id: 6, title: "Luxury Mall Location", desc: "Open in a brand-new, ultra-luxury outdoor shopping mall.", cost: 25000, effect: "Bad", rationale: "Over-leveraged: Rent is astronomical. Impossible volume needed to break even.", type: "Revenue" },
    { id: 7, title: "Mobile Pizza Truck", desc: "Set up a mobile pizza truck for weekend downtown festivals.", cost: 12000, effect: "Good", rationale: "Captures highly concentrated, high-intent foot traffic.", type: "Revenue" },
    { id: 8, title: "Commuter Town Dining Room", desc: "Build a massive 100-seat dining room in a commuter town.", cost: 18000, effect: "Bad", rationale: "Wasted Space: Commuters want quick takeout; the dining room stays empty.", type: "Revenue" },
    { id: 9, title: "Movie Theater Lease", desc: "Buy out a lease next to a popular movie theater.", cost: 18000, effect: "Good", rationale: "Perfectly captures the traditional 'dinner and a movie' crowd.", type: "Revenue" },
    { id: 10, title: "Subway Hub Entrance", desc: "Place the store right next to a major subway hub entrance.", cost: 20000, effect: "Bad", rationale: "Friction: Commuters are rushing and won't carry awkward pizza boxes.", type: "Revenue" },

    // 2. Target Customers
    { id: 11, title: "Family Night Bundle", desc: "Launch a 'Family Night' bundle marketed to local parents.", cost: 9000, effect: "Good", rationale: "Attracts large groups, guaranteeing a high total transaction value.", type: "Revenue" },
    { id: 12, title: "Fashion TikToker", desc: "Hire a famous fashion TikToker for a sponsored video post.", cost: 9000, effect: "Bad", rationale: "Wrong Demographic: Massive global reach, but useless for a local 5-mile radius.", type: "Revenue" },
    { id: 13, title: "Office Lunch Ads", desc: "Run targeted social media for office workers' quick lunches.", cost: 7500, effect: "Good", rationale: "High conversion rate directly addressing the midday slump.", type: "Revenue" },
    { id: 14, title: "Allergy Prep Stations", desc: "Set up 4 dedicated prep stations to perfectly cater to rare allergies.", cost: 14000, effect: "Bad", rationale: "Bloated Overhead: Massive space and slow prep for a tiny market fraction.", type: "Efficiency" },
    { id: 15, title: "Night Owl Campaign", desc: "Create a 'Night Owl' ad campaign for late-night college students.", cost: 6000, effect: "Good", rationale: "Effectively owns a specific, underserved niche market.", type: "Revenue" },
    { id: 16, title: "Kids Eat Free Weekend", desc: "Run a 'Kids Eat Free' campaign every single weekend.", cost: 6000, effect: "Bad", rationale: "Margin Killer: Giving away food during peak times when families pay full price.", type: "Revenue" },
    { id: 17, title: "Daycare Pizza Friday", desc: "Partner with local daycares for 'Pizza Friday' orders.", cost: 3000, effect: "Good", rationale: "Secures consistent, highly predictable weekly bulk revenue.", type: "Revenue" },
    { id: 18, title: "Country Club Sponsor", desc: "Sponsor a massive luxury country club golf tournament.", cost: 10000, effect: "Bad", rationale: "Brand Misalignment: Wrong target audience for a fast-casual pizza brand.", type: "Revenue" },
    { id: 19, title: "High-Income Direct Mail", desc: "Direct mail menus to high-income zip codes with family data.", cost: 8500, effect: "Good", rationale: "Targets demographics with higher disposable income for premium orders.", type: "Revenue" },
    { id: 20, title: "Tourist Marketing", desc: "Focus all marketing heavily on tourists in a residential neighborhood.", cost: 7000, effect: "Bad", rationale: "Wasted Ad Spend: Tourists don't visit residential zones.", type: "Revenue" },

    // 3. Store Competition & Differentiation
    { id: 21, title: "Wood-Fired Oven", desc: "Invest in a wood-fired brick oven for authentic Neapolitan crust.", cost: 16000, effect: "Good", rationale: "Creates a strong product differentiator from generic fast-food pizza.", type: "Product" },
    { id: 22, title: "Price Drop War", desc: "Drop all menu prices by 30% to crush the chain next door.", cost: 0, effect: "Bad", rationale: "Race to the Bottom: Revenue jumps, but gross profit vanishes.", type: "Revenue" },
    { id: 23, title: "20-Minute Delivery", desc: "Guarantee 20-minute delivery enabled by tight local logistics.", cost: 12000, effect: "Good", rationale: "Wins massive market share based on speed and reliability.", type: "Efficiency" },
    { id: 24, title: "75 Toppings Menu", desc: "Expand the menu to 75 toppings so 'everyone gets what they want'.", cost: 8000, effect: "Bad", rationale: "Operational Nightmare: Decision paralysis and slow kitchen throughput.", type: "Product" },
    { id: 25, title: "Artisanal Cheeses", desc: "Source exclusive, local artisanal cheeses.", cost: 9500, effect: "Good", rationale: "Builds a premium 'moat' that chains cannot easily copy.", type: "Product" },
    { id: 26, title: "Imported Organic Tomatoes", desc: "Source 100% imported organic Italian tomatoes for standard sauce.", cost: 11000, effect: "Bad", rationale: "Price Ceiling: Costs skyrocket, but locals won't pay $28 for a cheese pizza.", type: "Product" },
    { id: 27, title: "Instagrammable Pizza", desc: "Create a highly 'Instagrammable' themed pizza (e.g., star-shaped).", cost: 7000, effect: "Good", rationale: "Generates free, organic marketing via customer social media.", type: "Marketing" },
    { id: 28, title: "Annual Rebranding", desc: "Change the restaurant's name and branding every year to 'stay fresh'.", cost: 15000, effect: "Bad", rationale: "Destroys Brand Equity: Confuses loyal customers.", type: "Marketing" },
    { id: 29, title: "Spicy Honey Drizzle", desc: "Develop a proprietary, secret-recipe spicy honey drizzle.", cost: 6500, effect: "Good", rationale: "Low-cost flavor innovation that drives unique cravings.", type: "Product" },
    { id: 30, title: "Formal Dress Code", desc: "Require a strict formal dress code to make the pizza seem 'premium'.", cost: 2000, effect: "Bad", rationale: "Alienation: Misunderstands the casual nature of pizza.", type: "Marketing" },

    // 4. Increasing AOV - Enrich Product Mix
    { id: 31, title: "Truffle & Prosciutto", desc: "Introduce a premium 'Truffle & Prosciutto' gourmet pizza.", cost: 11000, effect: "Good", rationale: "Attracts customers willing to pay higher prices, lifting AOV.", type: "Product" },
    { id: 32, title: "Novelty Party Pizza", desc: "Sell a 36-inch 'Novelty Party Pizza' for only $5 more than a large.", cost: 3000, effect: "Bad", rationale: "Throughput Bottleneck: Takes up the entire oven and destroys margins.", type: "Product" },
    { id: 33, title: "Vegan Cheese Line", desc: "Launch a high-margin vegan cheese and plant-based sausage line.", cost: 8000, effect: "Good", rationale: "Captures a demographic willing to pay a premium.", type: "Product" },
    { id: 34, title: "Rare Artisanal Sodas", desc: "Import rare, artisanal glass-bottled sodas to sell for $6 each.", cost: 4500, effect: "Bad", rationale: "Price Shock: Customers balk and ask for tap water.", type: "Product" },
    { id: 35, title: "Seasonal Specials", desc: "Offer seasonal specials (e.g., 'Thanksgiving Turkey Pizza').", cost: 6000, effect: "Good", rationale: "Creates marketing urgency and allows for premium pricing.", type: "Marketing" },
    { id: 36, title: "Free Garlic Knots", desc: "Give away a free order of garlic knots with every large pizza.", cost: 5000, effect: "Bad", rationale: "Cannibalization: Trains customers to never buy sides again.", type: "Marketing" },
    { id: 37, title: "Stuffed Crust Upgrade", desc: "Add a 'Stuffed Crust' upgrade option for $3 extra.", cost: 5500, effect: "Good", rationale: "Popular, high-margin add-on that instantly increases ticket size.", type: "Product" },
    { id: 38, title: "Gold Leaf Pizza", desc: "Sell 'gourmet' pizza slices wrapped in edible gold leaf for $50.", cost: 5000, effect: "Bad", rationale: "Gimmick Trap: Brief buzz but fails to drive sustainable volume.", type: "Product" },
    { id: 39, title: "Half-and-Half Fee", desc: "Introduce a 'Half-and-Half' premium split-pie fee.", cost: 2500, effect: "Good", rationale: "Smartly monetizes customer customization.", type: "Revenue" },
    { id: 40, title: "Iberico Chorizo Swap", desc: "Replace standard pepperoni with expensive Iberico chorizo at no extra charge.", cost: 9000, effect: "Bad", rationale: "Margin Drain: Increases COGS without raising the price.", type: "Product" },

    // 5. Increasing AOV - Pair with Sides and Drinks
    { id: 41, title: "Game Day Combo", desc: "Create a 'Game Day' combo: 2 Pizzas, Wings, and a 2-Liter soda.", cost: 6000, effect: "Good", rationale: "Bundling increases total bill and perceived value.", type: "Revenue" },
    { id: 42, title: "Minimum Order Rule", desc: "Enforce a strict minimum order of $40 for all dine-in customers.", cost: 0, effect: "Bad", rationale: "Lost Sales: Drives away solo diners and casual eaters.", type: "Revenue" },
    { id: 43, title: "House-Made Knots", desc: "Introduce house-made garlic knots and artisanal dipping sauces.", cost: 7500, effect: "Good", rationale: "Irresistible, low-cost/high-margin appetizers.", type: "Product" },
    { id: 44, title: "Cheap Toy Bundle", desc: "Bundle a cheap plastic toy with every adult meal to 'add value'.", cost: 4000, effect: "Bad", rationale: "Wasted Capital: Adds COGS but zero perceived value for adults.", type: "Product" },
    { id: 45, title: "Craft Beer & Wine", desc: "Add a selection of craft beers and local wines (requires license).", cost: 18000, effect: "Good", rationale: "Dramatically increases adult dinner AOV.", type: "Revenue" },
    { id: 46, title: "Mixology Mocktail Bar", desc: "Replace fountain sodas with a complex 'mixology' mocktail bar.", cost: 12000, effect: "Bad", rationale: "Operational Drag: Slows down service massively.", type: "Efficiency" },
    { id: 47, title: "Upsell Training", desc: "Train cashiers to actively ask, 'Would you like cinnamon sticks today?'", cost: 4000, effect: "Good", rationale: "Consistent verbal upselling reliably raises AOV.", type: "Efficiency" },
    { id: 48, title: "Paid Tap Water", desc: "Charge $2 for basic tap water to 'maximize beverage revenue'.", cost: 0, effect: "Bad", rationale: "Customer Resentment: Negative reviews cost more than the water revenue.", type: "Revenue" },
    { id: 49, title: "Gelato Counter", desc: "Invest in a gelato counter for high-end dessert pairings.", cost: 14000, effect: "Good", rationale: "Captures the 'sweet tooth' dollar before exit.", type: "Product" },
    { id: 50, title: "Custom Cakes", desc: "Sell full-sized, expensive custom birthday cakes.", cost: 8000, effect: "Bad", rationale: "Wrong Expectation: High spoilage; customers don't buy $60 cakes here.", type: "Product" },

    // 6. Increasing Number of Orders - All Day Parts
    { id: 51, title: "Breakfast Pizza", desc: "Launch a 'Breakfast Pizza' with eggs and bacon, opening at 7 AM.", cost: 12000, effect: "Good", rationale: "Captures a new, uncontested morning revenue stream.", type: "Revenue" },
    { id: 52, title: "24/7 Operations", desc: "Keep the store open 24/7 to catch the late-night crowd.", cost: 12000, effect: "Bad", rationale: "Variable Cost Spike: Paying staff at 4AM for 2 orders is a bleed.", type: "Revenue" },
    { id: 53, title: "Afternoon Tea Set", desc: "Introduce a 'Mini Pizza & Coffee' afternoon tea set.", cost: 8000, effect: "Good", rationale: "Drives traffic during dead afternoon hours.", type: "Revenue" },
    { id: 54, title: "Lunch Buffet", desc: "Offer an $8.99 'All-You-Can-Eat' weekday lunch buffet.", cost: 7000, effect: "Bad", rationale: "Inventory Drain: Customers eat high-cost proteins and ruin turnover.", type: "Revenue" },
    { id: 55, title: "Express Lunch", desc: "Create a 15-minute 'Express Lunch' guarantee for solo diners.", cost: 7000, effect: "Good", rationale: "Ensures high throughput and captures office workers.", type: "Efficiency" },
    { id: 56, title: "Lunch Rush Discount", desc: "Offer a 50% discount on all food during the 12 PM - 1 PM rush.", cost: 0, effect: "Bad", rationale: "Margin Sacrifice: Giving away profit when demand is highest.", type: "Revenue" },
    { id: 57, title: "Late Night Happy Hour", desc: "Run a 'Late Night Happy Hour' offering half-price sides after 10 PM.", cost: 5000, effect: "Good", rationale: "Incentivizes orders during off-peak night hours.", type: "Revenue" },
    { id: 58, title: "Jazz Brunch", desc: "Run a massive Sunday morning brunch event with a 5-piece live jazz band.", cost: 10000, effect: "Bad", rationale: "Overhead Bloat: Entertainment costs a $15 pizza cannot cover.", type: "Marketing" },
    { id: 59, title: "2 AM Weekend Hours", desc: "Extend weekend hours to 2 AM to capture the nightlife crowd.", cost: 9500, effect: "Good", rationale: "High volume of hungry, price-insensitive late-night customers.", type: "Revenue" },
    { id: 60, title: "Closed Mondays", desc: "Close the kitchen completely on Mondays to save on labor.", cost: 0, effect: "Bad", rationale: "Fixed Cost Trap: Rent still accrues, and you break habits.", type: "Efficiency" },

    // 7. Membership & Online
    { id: 61, title: "Custom Mobile App", desc: "Build a custom mobile app with one-tap saved ordering.", cost: 24000, effect: "Good", rationale: "Removes ordering friction, increasing reorder rates.", type: "Technology" },
    { id: 62, title: "Proprietary Delivery App", desc: "Build a proprietary delivery app from scratch to avoid fees.", cost: 28000, effect: "Bad", rationale: "Sunk Cost: Consumers rarely download single-restaurant apps.", type: "Technology" },
    { id: 63, title: "Pizza Points", desc: "Launch a 'Pizza Points' loyalty program (buy 10, get 1 free).", cost: 8500, effect: "Good", rationale: "Gamifies the experience, locking in customer loyalty.", type: "Marketing" },
    { id: 64, title: "Paper Loyalty Form", desc: "Require customers to fill out a 3-page physical paper form for points.", cost: 1000, effect: "Bad", rationale: "Friction: Zero adoption due to terrible user experience.", type: "Marketing" },
    { id: 65, title: "Delivery Platforms", desc: "Partner strategically with major delivery platforms (UberEats/DoorDash).", cost: 12000, effect: "Good", rationale: "Instantly expands customer reach beyond footfall.", type: "Revenue" },
    { id: 66, title: "Unlimited Subscription", desc: "Offer a paid $100/month 'VIP Unlimited Pizza Subscription'.", cost: 5000, effect: "Bad", rationale: "Heavy-User Trap: Only heavy users buy this, ruining margins.", type: "Revenue" },
    { id: 67, title: "App Tuesday Promo", desc: "Offer an exclusive 15% discount for app-users on slow Tuesdays.", cost: 6000, effect: "Good", rationale: "Shifts volume to digital and boosts slow days.", type: "Marketing" },
    { id: 68, title: "Push Notification Spam", desc: "Send promotional push notifications to app users every 4 hours.", cost: 2000, effect: "Bad", rationale: "Brand Fatigue: Causes massive app deletion.", type: "Marketing" },
    { id: 69, title: "Reactivation Email", desc: "Send a targeted 'We Miss You' email with a promo to inactive members.", cost: 4000, effect: "Good", rationale: "Cost-effective way to reactivate dormant accounts.", type: "Marketing" },
    { id: 70, title: "No Delivery Apps", desc: "Refuse to take orders via third-party delivery apps to 'protect margins'.", cost: 0, effect: "Bad", rationale: "Lost Market Share: You lose 40% of modern diners.", type: "Revenue" },

    // 8. Profitability
    { id: 71, title: "Bulk Flour Contract", desc: "Sign a bulk 1-year contract for flour and tomatoes at a fixed rate.", cost: 15000, effect: "Good", rationale: "Enhances bargaining power and locks in COGS.", type: "Profit" },
    { id: 72, title: "5-Year Box Supply", desc: "Buy a 5-year supply of custom boxes to get the lowest wholesale price.", cost: 20000, effect: "Bad", rationale: "Tied-up Capital: Drains cash and takes up massive space.", type: "Profit" },
    { id: 73, title: "Commissary Kitchen", desc: "Open a central commissary kitchen to prep dough for 3 local branches.", cost: 25000, effect: "Good", rationale: "Scales operations and lowers per-unit labor costs.", type: "Efficiency" },
    { id: 74, title: "Dairy Farm Buyout", desc: "Vertically integrate by buying a local dairy farm to make your own cheese.", cost: 45000, effect: "Bad", rationale: "Loss of Focus: Massive CapEx and operational risk.", type: "Profit" },
    { id: 75, title: "Soda Pouring Rights", desc: "Negotiate an exclusive pouring rights contract with a soda brand.", cost: 5000, effect: "Good", rationale: "Lowers beverage costs and adds upfront cash.", type: "Profit" },
    { id: 76, title: "Supplier Ultimatum", desc: "Demand a 50% price cut from your key local supplier or threaten to leave.", cost: 0, effect: "Bad", rationale: "Supply Chain Ruin: Supplier drops you, leaving you with no ingredients.", type: "Profit" },
    { id: 77, title: "Purchasing Co-op", desc: "Form a purchasing cooperative with other non-competing restaurants.", cost: 6000, effect: "Good", rationale: "Pools buying power to demand wholesale pricing.", type: "Profit" },
    { id: 78, title: "Monthly Supplier Switch", desc: "Switch to a new, cheaper ingredient supplier every single month.", cost: 2000, effect: "Bad", rationale: "Inconsistency: Unpredictable quality ruins reputation.", type: "Profit" },
    { id: 79, title: "Portion Controls", desc: "Standardize portion controls (e.g., exactly 4 oz of cheese).", cost: 3500, effect: "Good", rationale: "Stops 'over-topping' waste, improving margins.", type: "Efficiency" },
    { id: 80, title: "Expiring Ingredients", desc: "Only buy ingredients that are 1 day away from expiration to save cash.", cost: 1000, effect: "Bad", rationale: "Spoilage Risk: Waste rates skyrocket.", type: "Profit" },

    // 9. Fixed Costs
    { id: 81, title: "Ghost Kitchen Sublease", desc: "Sublease the kitchen to a 'ghost kitchen' bakery during night shifts.", cost: 4000, effect: "Good", rationale: "Generates extra revenue to cover fixed rent.", type: "Efficiency" },
    { id: 82, title: "Industrial Dough Mixer", desc: "Buy a $50,000 industrial, factory-scale dough-mixing machine.", cost: 50000, effect: "Bad", rationale: "Overcapacity: Depreciation crushes net income.", type: "Efficiency" },
    { id: 83, title: "Fixed Lease Rate", desc: "Renegotiate the lease for a 5-year fixed rate.", cost: 8000, effect: "Good", rationale: "Locks in fixed costs; revenue growth becomes pure profit.", type: "Profit" },
    { id: 84, title: "Revenue Share Lease", desc: "Sign a lease where rent is calculated as 25% of total top-line revenue.", cost: 0, effect: "Bad", rationale: "Destroys Leverage: Rent scales up with sales.", type: "Profit" },
    { id: 85, title: "Corporate Catering", desc: "Launch a massive catering push for local offices during weekdays.", cost: 9000, effect: "Good", rationale: "Increases revenue without increasing fixed rent.", type: "Revenue" },
    { id: 86, title: "Idle Drivers", desc: "Keep 5 delivery drivers on the clock during dead afternoon hours.", cost: 6000, effect: "Bad", rationale: "Labor Bleed: Paying staff to stand around.", type: "Efficiency" },
    { id: 87, title: "Cross-Training", desc: "Cross-train the prep chefs to also handle the cash register.", cost: 5500, effect: "Good", rationale: "Maximizes utility of fixed salaried staff.", type: "Efficiency" },
    { id: 88, title: "VP of Innovation", desc: "Hire a full-time, high-salaried 'VP of Pizza Innovation'.", cost: 20000, effect: "Bad", rationale: "Administrative Bloat: Too much overhead for one store.", type: "Efficiency" },
    { id: 89, title: "Frozen Pizza Line", desc: "Sell frozen pizzas to local grocery stores using kitchen downtime.", cost: 11000, effect: "Good", rationale: "Spreads fixed costs over a new sales channel.", type: "Revenue" },
    { id: 90, title: "Delivery Fleet", desc: "Buy a fleet of 5 branded, expensive delivery cars.", cost: 60000, effect: "Bad", rationale: "Unnecessary CapEx: Massive depreciation/insurance.", type: "Efficiency" },

    // 10. Efficiency
    { id: 91, title: "Self-Order Kiosks", desc: "Install automated self-ordering kiosks in the dining room.", cost: 14000, effect: "Good", rationale: "Decreases need for order-taking staff.", type: "Efficiency" },
    { id: 92, title: "AI Voice Ordering", desc: "Replace all human cashiers with an unproven AI voice-ordering system.", cost: 15000, effect: "Bad", rationale: "Friction: Misheard orders lead to lost lifetime value.", type: "Efficiency" },
    { id: 93, title: "Routing Software", desc: "Invest in routing software to optimize multi-stop delivery driving.", cost: 7500, effect: "Good", rationale: "Drivers complete more deliveries per hour.", type: "Efficiency" },
    { id: 94, title: "Batch Delivery Mandate", desc: "Mandate drivers must take 5 orders at once before leaving.", cost: 0, effect: "Bad", rationale: "Quality Drop: Cold pizza leads to refunds.", type: "Efficiency" },
    { id: 95, title: "Inventory Software", desc: "Implement inventory management software to track ingredient yields.", cost: 6000, effect: "Good", rationale: "Reduces hidden spoilage and theft.", type: "Efficiency" },
    { id: 96, title: "No AC Policy", desc: "Turn off the air conditioning in the dining room during summer.", cost: 0, effect: "Bad", rationale: "False Economy: Walk-outs increase dramatically.", type: "Efficiency" },
    { id: 97, title: "Smart Conveyor Oven", desc: "Upgrade to a smart, energy-efficient conveyor oven.", cost: 21000, effect: "Good", rationale: "Cooks perfectly with less oversight.", type: "Efficiency" },
    { id: 98, title: "Pepperoni Audit", desc: "Require managers to manually double-count every piece of pepperoni.", cost: 3000, effect: "Bad", rationale: "Micromanagement: Wastes managerial time.", type: "Efficiency" },
    { id: 99, title: "Digital Scheduling", desc: "Implement a digital scheduling app to avoid overstaffing.", cost: 4500, effect: "Good", rationale: "Aligns labor expenses with real-time traffic.", type: "Efficiency" },
    { id: 100, title: "Chef Janitors", desc: "Fire cleaning crew and make exhausted chefs mop at 2 AM.", cost: 0, effect: "Bad", rationale: "Morale Killer: Kitchen turnover spikes.", type: "Efficiency" }
];

const generateCoreStrategies = (): Strategy[] => {
    return CORE_STRATEGIES_DATA.map(data => {
        const isBad = data.effect === 'Bad';
        return {
            id: `core_${data.id}`,
            title: data.title,
            description: data.desc,
            type: data.type as any,
            cost: data.cost,
            cooldown: 0,
            quality: isBad ? 'Bad' : undefined,
            impact: createImpact(data.cost, (s) => {
                if (isBad) {
                    // Bad strategies generally hurt satisfaction, increase expenses, or reduce orders
                    // We add some randomness to make it dynamic
                    return {
                        operatingExpenses: s.operatingExpenses + (data.cost * 0.1) + (Math.random() * 500),
                        customerSatisfaction: Math.max(0, s.customerSatisfaction - (5 + Math.random() * 5)),
                        dailyOrders: s.dailyOrders * (0.95 + (Math.random() * 0.05)) // Slight drop
                    };
                } else {
                    // Good strategies generally help
                    // Scale impact based on cost
                    const impactScale = Math.max(1, data.cost / 5000);
                    return {
                        dailyOrders: s.dailyOrders + (impactScale * 1.5),
                        customerSatisfaction: Math.min(100, s.customerSatisfaction + impactScale),
                        operatingExpenses: Math.max(0, s.operatingExpenses - (data.type === 'Efficiency' ? impactScale * 100 : 0))
                    };
                }
            }),
            successLog: isBad ? data.rationale : `Success! ${data.rationale}`,
            failureLog: isBad ? `Failed. ${data.rationale}` : "Execution failed."
        };
    });
};

// --- PROCEDURAL GENERATORS ---

// 5. Procedural Bad Strategies (To flood the pool)
const BAD_IDEAS = [
    { name: 'NFT Loyalty Program', desc: 'Minting JPEGs of pepperoni.', cost: 8000 },
    { name: 'VR Dining Experience', desc: 'Headsets while eating.', cost: 15000 },
    { name: 'Drone Delivery (Beta)', desc: 'Experimental and dangerous.', cost: 20000 },
    { name: 'AI Waiter Holograms', desc: 'Creepy and glitchy.', cost: 12000 },
    { name: 'Edible Menu Paper', desc: 'Gimmicky and gross.', cost: 3000 },
    { name: 'Sub-prime Franchise', desc: 'Opening a location in a swamp.', cost: 40000 },
    { name: 'Gold Leaf Pizza', desc: 'Tastes like metal.', cost: 5000 },
    { name: 'Lobster Tank', desc: 'High maintenance, low sales.', cost: 6000 },
    { name: 'Live Polka Band', desc: 'Loud and annoying.', cost: 2000 },
    { name: 'Phone Booth Aquarium', desc: 'Leaked everywhere.', cost: 4500 }
];

const generateBadStrategies = (): Strategy[] => {
    return BAD_IDEAS.map((idea, idx) => ({
        id: `bad_proc_${idx}`,
        title: idea.name,
        description: idea.desc,
        type: 'Speculative',
        cost: idea.cost,
        cooldown: 0,
        quality: 'Bad',
        impact: createImpact(idea.cost, (s) => ({
            operatingExpenses: s.operatingExpenses + 100 // Just adds cost
        })),
        successLog: "Executed. It was a disaster.",
        failureLog: "Failed immediately. Money gone."
    }));
};

// 1. Marketing Micro-Campaigns
const MARKETING_CHANNELS = [
    { name: 'Local Paper', baseCost: 4500, orderGain: 1, opex: 300 },
    { name: 'Instagram Boost', baseCost: 2400, orderGain: 0.5, opex: 150 },
    { name: 'Community Board', baseCost: 1200, orderGain: 0.2, opex: 60 },
    { name: 'Radio Spot', baseCost: 10500, orderGain: 2, opex: 900 },
    { name: 'Influencer Post', baseCost: 25500, orderGain: 4, opex: 1500 },
    { name: 'Direct Mailer', baseCost: 13500, orderGain: 2.5, opex: 1200 },
    { name: 'Podcast Read', baseCost: 8400, orderGain: 1.2, opex: 450 },
    { name: 'Google Ads', baseCost: 9000, orderGain: 1.5, opex: 1200 }, // High recurring
];

const generateMarketing = (): Strategy[] => {
    return MARKETING_CHANNELS.flatMap((channel, idx) => {
        // Create 3 tiers for each channel
        return [1, 2, 3].map(tier => ({
            id: `mkt_${idx}_t${tier}`,
            title: `${channel.name} (Tier ${tier})`,
            description: `Marketing campaign. Increases orders by ~${(channel.orderGain * tier).toFixed(1)}/day.`,
            type: 'Revenue' as const,
            cost: channel.baseCost * tier,
            cooldown: 0,
            impact: createImpact(channel.baseCost * tier, (s) => ({
                dailyOrders: s.dailyOrders + (channel.orderGain * tier),
                operatingExpenses: s.operatingExpenses + (channel.opex * tier)
            })),
            successLog: `Campaign live! Orders up by ${channel.orderGain * tier}/day.`,
            failureLog: "Campaign flopped. Zero conversion."
        }));
    });
};

// 2. Inventory Spot Buys
const INGREDIENTS = [
    'Pepperoni', 'Mozzarella', 'Flour', 'Tomato Sauce', 'Olive Oil', 'Mushrooms', 'Sausage', 'Peppers', 'Onions', 'Garlic'
];

const generateInventory = (): Strategy[] => {
    return INGREDIENTS.flatMap((ing, idx) => {
        return [
            {
                id: `inv_spot_${idx}`,
                title: `Spot Buy: ${ing}`,
                description: `Bulk purchase of ${ing}. Increases inventory asset.`,
                type: 'Efficiency' as const,
                cost: 9000,
                cooldown: 0,
                // Gain slightly more inventory value than cash spent
                impact: createImpact(9000, {}, { inventory: 9600 }),
                successLog: `Warehouse stocked with ${ing}.`,
                failureLog: `Shipment of ${ing} arrived spoiled.`
            },
            {
                id: `inv_contract_${idx}`,
                title: `Supplier Contract: ${ing}`,
                description: `Long term deal for ${ing}. Legal fees up front.`,
                type: 'Profit' as const,
                cost: 7500, // Legal/Setup fee
                cooldown: 0,
                impact: createImpact(7500, (s) => ({ cogs: s.cogs * 0.992 })),
                successLog: `Locked in low rates for ${ing}.`,
                failureLog: "Supplier backed out at the last minute."
            }
        ];
    });
};

// 3. Maintenance & Facility
const FIXTURES = [
    'Oven Door', 'Walk-in Fridge', 'Dishwasher', 'Front Door', 'POS Terminal', 'Neon Sign', 'Restroom Plumbing', 'HVAC Unit', 'Delivery Scooter', 'Tables'
];

const generateMaintenance = (): Strategy[] => {
    return FIXTURES.flatMap((item, idx) => {
        return [
            {
                id: `maint_repair_${idx}`,
                title: `Repair ${item}`,
                description: `Fixing ${item}. Expensive but necessary.`,
                type: 'Efficiency' as const,
                cost: 3600 + (idx * 300),
                cooldown: 0,
                impact: createImpact(3600 + (idx * 300), (s) => ({ customerSatisfaction: Math.min(100, s.customerSatisfaction + 0.5) })),
                successLog: `${item} is working like new.`,
                failureLog: `Tried to fix ${item}, but broke it worse.`
            },
            {
                id: `maint_replace_${idx}`,
                title: `Replace ${item}`,
                description: `New ${item}. Capital expenditure.`,
                type: 'Efficiency' as const,
                cost: 13500 + (idx * 600),
                cooldown: 0,
                impact: createImpact(13500 + (idx * 600), (s) => ({ customerSatisfaction: Math.min(100, s.customerSatisfaction + 1.5) }), { equipment: 3000 }),
                successLog: `Shiny new ${item} installed!`,
                failureLog: `New ${item} was DOA. Warranty claim filed.`
            }
        ];
    });
};

// 4. Staff & HR
const ROLES = ['Server', 'Dishwasher', 'Line Cook', 'Delivery Driver', 'Host', 'Assistant Manager'];

const generateStaff = (): Strategy[] => {
    return ROLES.flatMap((role, idx) => {
        return [
            {
                id: `staff_hire_${idx}`,
                title: `Hire ${role}`,
                description: `Recruiting fees & onboarding. Increases OpEx, boosts throughput.`,
                type: 'Revenue' as const,
                cost: 7500, // Recruiting
                cooldown: 0,
                impact: createImpact(7500, (s) => ({ 
                    operatingExpenses: s.operatingExpenses + 450, // Salary
                    dailyOrders: s.dailyOrders + 1.5 
                })),
                successLog: `New ${role} joined the team.`,
                failureLog: `Candidate ghosted us on day one.`
            },
            {
                id: `staff_train_${idx}`,
                title: `Train ${role}s`,
                description: `Better service. Increases OpEx slightly (raises).`,
                type: 'Efficiency' as const,
                cost: 3600,
                cooldown: 0,
                impact: createImpact(3600, (s) => ({ 
                    operatingExpenses: s.operatingExpenses + 80,
                    customerSatisfaction: s.customerSatisfaction + 1 
                })),
                successLog: `${role}s are much sharper now.`,
                failureLog: "Training session was a waste of time."
            },
            {
                id: `staff_bonus_${idx}`,
                title: `Bonus: ${role}s`,
                description: `One-time morale boost.`,
                type: 'Efficiency' as const,
                cost: 9000,
                cooldown: 0,
                impact: createImpact(9000, (s) => ({ 
                    customerSatisfaction: s.customerSatisfaction + 2 
                })),
                successLog: "Morale is through the roof!",
                failureLog: "They spent the bonus and are still grumpy."
            }
        ];
    });
};

export const STRATEGY_POOL: Strategy[] = [
    ...generateCoreStrategies(),
    // ...generateBadStrategies(), 
    // ...generateMarketing(),
    // ...generateInventory(),
    // ...generateMaintenance(),
    // ...generateStaff()
];

export const shuffleStrategies = (array: Strategy[]) => {
    return [...array].sort(() => Math.random() - 0.5);
};
