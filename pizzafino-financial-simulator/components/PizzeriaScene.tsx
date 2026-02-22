import React, { useEffect, useRef } from 'react';
import { STRATEGY_POOL } from '../constants';
import { ChefHat, Zap, Users, Star, Truck, TrendingUp, AlertTriangle } from 'lucide-react';

interface Props {
  dailyOrders: number; // Controls spawn rate
  activeStrategyIds: string[];
  satisfaction: number; // Controls chaos visuals
}

interface Customer {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  state: 'ENTERING' | 'QUEUEING' | 'ORDERING' | 'SEATED' | 'EATING' | 'LEAVING';
  color: string;
  timer: number;
  tableIndex?: number;
}

const PizzeriaScene: React.FC<Props> = ({ dailyOrders, activeStrategyIds, satisfaction }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Game loop state refs (to avoid re-renders)
  const customers = useRef<Customer[]>([]);
  const frameId = useRef<number>(0);
  const spawnTimer = useRef<number>(0);
  
  // Tables configuration (x, y coordinates on canvas)
  const tables = [
    { x: 300, y: 100, occupied: false },
    { x: 450, y: 100, occupied: false },
    { x: 300, y: 200, occupied: false },
    { x: 450, y: 200, occupied: false },
    { x: 600, y: 150, occupied: false }, // VIP Table
  ];

  // Helper: Check if ANY active strategy matches a keyword (since we have 50+ now)
  const hasUpgrade = (keyword: string) => activeStrategyIds.some(id => id.includes(keyword));

  // Get full objects for display list
  const activeStrategies = STRATEGY_POOL.filter(s => activeStrategyIds.includes(s.id));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive Canvas Sizing
    const resizeCanvas = () => {
        if (containerRef.current && canvas) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = 300; // Fixed height
        }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    let lastTime = performance.now();

    const spawnCustomer = () => {
        // Higher dailyOrders = lower interval
        // Base: 40 orders -> spawn every 60 frames roughly
        // Max: 200 orders -> spawn every 10 frames
        const spawnThreshold = Math.max(10, 100 - (dailyOrders / 2)); 
        
        spawnTimer.current++;
        if (spawnTimer.current > spawnThreshold) {
            spawnTimer.current = 0;
            // Only spawn if we don't have too many (performance)
            if (customers.current.length < 30) {
                customers.current.push({
                    id: Math.random(),
                    x: 10, // Entrance
                    y: 250,
                    targetX: 120 + Math.random() * 20, // Counter queue
                    targetY: 150 + Math.random() * 50,
                    state: 'ENTERING',
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    timer: 0
                });
            }
        }
    };

    const update = (dt: number) => {
        spawnCustomer();

        // Update each customer
        customers.current.forEach(c => {
            const dx = c.targetX - c.x;
            const dy = c.targetY - c.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Movement speed
            const speed = 2; 

            if (dist > speed) {
                c.x += (dx / dist) * speed;
                c.y += (dy / dist) * speed;
            } else {
                // Reached target logic
                if (c.state === 'ENTERING') {
                    c.state = 'QUEUEING';
                    c.timer = 30 + Math.random() * 30; // Wait time
                } else if (c.state === 'QUEUEING') {
                    c.timer--;
                    if (c.timer <= 0) {
                        c.state = 'ORDERING';
                        // Find a table
                        const tableIdx = tables.findIndex(t => !t.occupied);
                        if (tableIdx !== -1) {
                            tables[tableIdx].occupied = true;
                            c.tableIndex = tableIdx;
                            c.targetX = tables[tableIdx].x;
                            c.targetY = tables[tableIdx].y;
                            c.state = 'SEATED';
                        } else {
                            // No tables, leave angry? or just stand and eat (simple: leave)
                            c.targetX = 10;
                            c.targetY = 280;
                            c.state = 'LEAVING';
                        }
                    }
                } else if (c.state === 'SEATED') {
                    c.timer = 0; // Just arrived at seat
                    // Stay seated for a while
                    c.state = 'EATING';
                    c.timer = 100 + Math.random() * 100;
                } else if (c.state === 'EATING') {
                    c.timer--;
                    if (c.timer <= 0) {
                        // Done eating
                        if (c.tableIndex !== undefined) tables[c.tableIndex].occupied = false;
                        c.targetX = 10;
                        c.targetY = 280;
                        c.state = 'LEAVING';
                    }
                } else if (c.state === 'LEAVING') {
                    // Remove
                    c.x = -100; // Mark for cleanup
                }
            }
        });

        // Cleanup
        customers.current = customers.current.filter(c => c.x > -50);
    };

    const draw = (ctx: CanvasRenderingContext2D) => {
        // Clear & Floor Color (Reacts to Satisfaction)
        if (satisfaction < 50) {
             ctx.fillStyle = '#fca5a5'; // Red tint (Chaos)
        } else if (satisfaction > 80) {
             ctx.fillStyle = '#ecfccb'; // Fresh green tint (Happy)
        } else {
             ctx.fillStyle = '#fef3c7'; // Standard beige
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- DRAW UPGRADE VISUALS (Background) ---
        
        // 1. Marketing Blitz (Billboard on back wall)
        if (hasUpgrade('marketing')) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(550, 20, 100, 60);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(550, 20, 100, 60);
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText("PIZZA!", 575, 45);
            ctx.font = '10px sans-serif';
            ctx.fillText("#Trending", 570, 65);
            ctx.fillStyle = '#9ca3af'; 
            ctx.fillRect(595, 80, 10, 20); // pole
        }

        // 2. Loyalty Program (Banner hanging from top left)
        if (hasUpgrade('loyalty') || hasUpgrade('club') || hasUpgrade('vip')) {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(10, 60);
            ctx.lineTo(40, 80);
            ctx.lineTo(70, 60);
            ctx.lineTo(70, 0);
            ctx.fill();
            ctx.fillStyle = '#b45309';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText("VIP", 30, 30);
            ctx.fillText("CLUB", 25, 45);
        }

        // --- FIXED STRUCTURES ---

        // Entrance Area
        ctx.fillStyle = '#d1d5db';
        ctx.fillRect(0, 220, 80, 80);
        ctx.fillStyle = '#374151';
        ctx.font = '10px sans-serif';
        ctx.fillText("Entrance", 15, 260);

        // Kitchen Floor
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(0, 0, 100, 220);
        ctx.fillStyle = '#9ca3af';
        ctx.fillText("KITCHEN", 20, 110);

        // 3. Supplier Deal (Sacks of flour in kitchen corner)
        if (hasUpgrade('supplier') || hasUpgrade('flour')) {
            ctx.fillStyle = '#d6d3d1'; // Flour sack color
            ctx.strokeStyle = '#a8a29e';
            ctx.lineWidth = 1;
            // Draw 3 sacks
            [0, 1, 2].forEach(i => {
                ctx.beginPath();
                ctx.ellipse(20 + (i*5), 180 - (i*5), 10, 8, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
            });
            ctx.fillStyle = '#4b5563';
            ctx.font = '8px sans-serif';
            ctx.fillText("Flour", 15, 195);
        }

        // Counter
        ctx.fillStyle = '#78350f'; // Wood
        ctx.fillRect(100, 100, 50, 150);
        ctx.fillStyle = '#fbbf24'; // Countertop
        ctx.fillRect(140, 100, 20, 150);
        
        // 4. Auto Oven (Tech Upgrade) - Robot Arm
        if (hasUpgrade('tech') || hasUpgrade('auto') || hasUpgrade('drone')) {
             // Base
             ctx.fillStyle = '#60a5fa';
             ctx.fillRect(40, 130, 40, 40);
             ctx.strokeStyle = '#2563eb';
             ctx.lineWidth = 3;
             
             // Arm Segments
             ctx.beginPath();
             ctx.moveTo(60, 150);
             ctx.lineTo(90, 140); 
             ctx.lineTo(130, 160); // End effector near counter
             ctx.stroke();
             
             // Claw
             ctx.strokeStyle = '#1e40af';
             ctx.beginPath();
             ctx.arc(130, 160, 5, 0, Math.PI);
             ctx.stroke();

             ctx.fillStyle = '#1e3a8a';
             ctx.font = '8px sans-serif';
             ctx.fillText("TECH+", 45, 125);
        }

        // Tables
        tables.forEach((t, i) => {
            // Table
            ctx.beginPath();
            ctx.arc(t.x, t.y, 25, 0, 2 * Math.PI);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // 5. Gourmet Menu (Fancy Table Cloths & Candles)
            if (hasUpgrade('gourmet') || hasUpgrade('facility') || hasUpgrade('patio')) {
                 ctx.fillStyle = '#fecaca'; // Red fancy cloth
                 ctx.beginPath();
                 ctx.arc(t.x, t.y, 20, 0, 2 * Math.PI);
                 ctx.fill();
                 
                 // Candle
                 ctx.fillStyle = '#fef08a';
                 ctx.beginPath();
                 ctx.arc(t.x, t.y, 3, 0, 2 * Math.PI);
                 ctx.fill();
            }

            // Chairs
            ctx.fillStyle = '#9ca3af';
            ctx.fillRect(t.x - 30, t.y - 10, 5, 20);
            ctx.fillRect(t.x + 25, t.y - 10, 5, 20);
        });

        // Draw Customers
        customers.current.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = c.color;
            ctx.fill();
            
            // Visuals for Anger (Low Satisfaction)
            if (satisfaction < 50) {
                 // Angry steam
                 ctx.fillStyle = '#555';
                 ctx.font = '10px Arial';
                 ctx.fillText('☁', c.x - 5, c.y - 10);
            }
            // Visuals for Happiness (Loyalty)
            else if (c.state === 'QUEUEING' && (hasUpgrade('loyalty') || hasUpgrade('vip'))) {
                // Heart for loyalty
                ctx.fillStyle = '#ec4899';
                ctx.font = '10px Arial';
                ctx.fillText('♥', c.x - 4, c.y - 10);
            }

            // Pizza eating state
            if (c.state === 'EATING') {
                ctx.fillStyle = '#fbbf24'; // Pizza color
                ctx.beginPath();
                ctx.moveTo(c.x, c.y);
                ctx.arc(c.x, c.y, 8, 0, Math.PI / 2);
                ctx.fill();
            }
        });
        
        // Effects
        // Marketing Blitz = Confetti
        if (hasUpgrade('marketing')) {
            if (Math.random() > 0.8) {
                ctx.fillStyle = Math.random() > 0.5 ? '#60a5fa' : '#f472b6';
                ctx.fillRect(10 + Math.random() * 40, 230 + Math.random() * 40, 3, 3);
            }
        }
    };

    const render = (time: number) => {
        lastTime = time;
        update(16); 
        if (canvas) draw(ctx);
        frameId.current = requestAnimationFrame(render);
    };

    render(performance.now());

    return () => {
        window.removeEventListener('resize', resizeCanvas);
        cancelAnimationFrame(frameId.current);
    };
  }, [dailyOrders, activeStrategyIds, satisfaction]);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row h-full md:h-[300px] border border-gray-200">
        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 relative bg-yellow-50 min-h-[200px]">
            <canvas ref={canvasRef} className="absolute inset-0" />
            
            {/* Overlay Labels */}
            <div className="absolute top-2 left-2 bg-white/80 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm z-10">
                Kitchen
            </div>
            <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur px-2 py-1 rounded text-xs font-bold shadow-sm z-10 flex items-center gap-1">
                Entrance <span className="text-gray-500 font-normal">({Math.floor(dailyOrders)} orders/day)</span>
            </div>
            
            {/* Satisfaction Chaos Indicator */}
            {satisfaction < 50 && (
                <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm animate-pulse flex items-center gap-1 z-10 border border-red-300">
                    <AlertTriangle className="w-3 h-3" />
                    CHAOS!
                </div>
            )}
        </div>

        {/* Improvements List Side Panel */}
        <div className="w-full md:w-64 bg-gray-50 border-l border-gray-200 p-4 flex flex-col">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-pizza-red" />
                Active Improvements
            </h3>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {activeStrategies.length === 0 ? (
                    <div className="text-xs text-gray-400 italic text-center py-8">
                        No improvements yet. Execute strategies to upgrade your pizzeria!
                    </div>
                ) : (
                    activeStrategies.map(strat => (
                        <div key={strat.id} className="bg-white p-2 rounded border border-gray-100 shadow-sm flex items-start gap-2 animate-fadeIn">
                            <div className="mt-0.5">
                                {strat.id.includes('marketing') && <Users className="w-4 h-4 text-blue-500" />}
                                {strat.id.includes('tech') && <Zap className="w-4 h-4 text-purple-500" />}
                                {strat.id.includes('gourmet') && <ChefHat className="w-4 h-4 text-red-500" />}
                                {(strat.id.includes('loyalty') || strat.id.includes('staff')) && <Star className="w-4 h-4 text-yellow-500" />}
                                {strat.id.includes('supplier') && <Truck className="w-4 h-4 text-green-500" />}
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-800">{strat.title}</div>
                                <div className="text-[10px] text-gray-500 leading-tight">{strat.description.slice(0, 40)}...</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};

export default PizzeriaScene;