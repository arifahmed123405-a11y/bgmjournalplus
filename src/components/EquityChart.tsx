import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';

interface ChartPoint {
  index: number;
  date: string;
  pnl: number;
  balance: number;
  pair?: string;
}

interface EquityChartProps {
  startingBalance: number;
  trades: { trade_date: string; gain_loss: number; pair: string }[];
}

export default function EquityChart({ startingBalance, trades }: EquityChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Handle ResizeObserver to make the chart fully responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 200),
          height: Math.max(height, 200),
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Sort trades chronologically and calculate cumulative balance
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  const points: ChartPoint[] = [
    { index: 0, date: 'Start', pnl: 0, balance: startingBalance, pair: '' },
  ];

  let currentBalance = startingBalance;
  sortedTrades.forEach((trade, i) => {
    currentBalance += Number(trade.gain_loss);
    points.push({
      index: i + 1,
      date: trade.trade_date,
      pnl: Number(trade.gain_loss),
      balance: Number(currentBalance.toFixed(2)),
      pair: trade.pair,
    });
  });

  const balances = points.map(p => p.balance);
  const maxVal = Math.max(...balances) * 1.05; // 5% padding
  const minVal = Math.min(...balances) * 0.95; // 5% padding
  const valRange = maxVal - minVal || 100;

  // Margin spacing
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const graphWidth = dimensions.width - margin.left - margin.right;
  const graphHeight = dimensions.height - margin.top - margin.bottom;

  // Coordinate scaling helpers
  const getX = (index: number) => {
    if (points.length <= 1) return margin.left;
    return margin.left + (index / (points.length - 1)) * graphWidth;
  };

  const getY = (balance: number) => {
    return margin.top + graphHeight - ((balance - minVal) / valRange) * graphHeight;
  };

  // Build SVG Path
  let pathD = '';
  let areaD = '';

  if (points.length > 0) {
    points.forEach((p, idx) => {
      const x = getX(p.index);
      const y = getY(p.balance);
      if (idx === 0) {
        pathD = `M ${x} ${y}`;
        areaD = `M ${x} ${margin.top + graphHeight} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }
    });
    areaD += ` L ${getX(points.length - 1)} ${margin.top + graphHeight} Z`;
  }

  // Create horizontal grid lines
  const gridLinesCount = 5;
  const gridLines = Array.from({ length: gridLinesCount }).map((_, i) => {
    const val = minVal + (i / (gridLinesCount - 1)) * valRange;
    return {
      value: val,
      y: getY(val),
    };
  });

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (points.length === 0 || !containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;

    // Find closest point by X coordinate
    let closest: ChartPoint = points[0];
    let minDiff = Infinity;

    points.forEach(p => {
      const pX = getX(p.index);
      const diff = Math.abs(pX - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    });

    setHoveredPoint(closest);
    setTooltipPos({
      x: getX(closest.index),
      y: getY(closest.balance) - 15,
    });
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <div ref={containerRef} className="w-full h-[320px] bg-transparent p-0 relative overflow-visible">
      {points.length <= 1 ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
          <span>No trade data logged yet for this account.</span>
          <span className="text-[10px] text-slate-600 mt-1">Logged trades will draw your real-time equity curve.</span>
        </div>
      ) : (
        <>
          <svg
            className="w-full h-full overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {gridLines.map((line, i) => (
              <g key={i} className="opacity-40">
                <line
                  x1={margin.left}
                  y1={line.y}
                  x2={dimensions.width - margin.right}
                  y2={line.y}
                  className="stroke-zinc-800"
                  strokeDasharray="4 4"
                />
                <text
                  x={margin.left - 10}
                  y={line.y + 4}
                  textAnchor="end"
                  className="fill-slate-500 font-mono text-[9px] select-none"
                >
                  ${line.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </text>
              </g>
            ))}

            {/* Gradient Area */}
            {areaD && (
              <path
                d={areaD}
                fill="url(#areaGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Main line */}
            {pathD && (
              <motion.path
                d={pathD}
                fill="none"
                stroke="#10b981"
                strokeWidth={2.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            )}

            {/* Data point dots */}
            {points.map((p) => (
              <circle
                key={p.index}
                cx={getX(p.index)}
                cy={getY(p.balance)}
                r={hoveredPoint?.index === p.index ? 5 : 2}
                className={`transition-all duration-150 ${
                  hoveredPoint?.index === p.index
                    ? 'fill-emerald-400 stroke-[#050507] stroke-[2px]'
                    : 'fill-emerald-500/60'
                }`}
              />
            ))}

            {/* Hover Vertical Guide Line */}
            {hoveredPoint && (
              <line
                x1={getX(hoveredPoint.index)}
                y1={margin.top}
                x2={getX(hoveredPoint.index)}
                y2={margin.top + graphHeight}
                className="stroke-zinc-800"
                strokeDasharray="2 2"
                pointerEvents="none"
              />
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && (
            <div
              style={{
                position: 'absolute',
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                transform: 'translate(-50%, -100%)',
              }}
              className="pointer-events-none z-10 min-w-[140px] rounded-lg border border-white/10 bg-[#050507] p-2.5 shadow-xl backdrop-blur-md text-xs transition-all duration-75"
            >
              <div className="text-[10px] font-mono text-slate-500 mb-1 flex justify-between">
                <span>{hoveredPoint.date}</span>
                {hoveredPoint.index > 0 && <span>Trade #{hoveredPoint.index}</span>}
              </div>
              <div className="font-semibold text-white mb-0.5">
                Balance: ${hoveredPoint.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {hoveredPoint.index > 0 && (
                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-white/5">
                  <span className={`h-1.5 w-1.5 rounded-full ${hoveredPoint.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className={hoveredPoint.pnl >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                    {hoveredPoint.pnl >= 0 ? '+' : ''}${hoveredPoint.pnl.toFixed(2)}
                  </span>
                  {hoveredPoint.pair && <span className="text-slate-400 font-mono text-[9px] uppercase">({hoveredPoint.pair})</span>}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
