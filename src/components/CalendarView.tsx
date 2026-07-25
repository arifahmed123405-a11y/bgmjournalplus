import React, { useState, useRef } from 'react';
import { Account, Trade } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Award,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  X,
  Eye,
  Download,
  Image as ImageIcon,
  TrendingUp,
  TrendingDown,
  Layers,
  Check,
  Loader2,
  Share2,
  BarChart3
} from 'lucide-react';
import { toPng } from 'html-to-image';

interface CalendarViewProps {
  account: Account | null;
  trades: Trade[];
  onOpenTradeDetails: (trade: Trade) => void;
  onAddToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function CalendarView({
  account,
  trades,
  onOpenTradeDetails,
  onAddToast,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ date: string; trades: Trade[] } | null>(null);

  // Export Modal States
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportMode, setExportMode] = useState<'month' | 'year'>('month');
  const [exportMonth, setExportMonth] = useState<number>(new Date().getMonth());
  const [exportYear, setExportYear] = useState<number>(new Date().getFullYear());
  const [exportingImage, setExportingImage] = useState<boolean>(false);

  const exportRef = useRef<HTMLDivElement>(null);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
          <CalendarIcon size={24} />
        </div>
        <h3 className="text-md font-medium text-white mb-1">No Trading Account Selected</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Please select or create a trading account from the top bar to initialize your calendar view.
        </p>
      </div>
    );
  }

  // Filter trades for the selected account
  const accountTrades = trades.filter((t) => t.account_id === account.id);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed (Jan=0, Dec=11)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigate Months / Years
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(year - 1, month, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else {
      setCurrentDate(new Date(year + 1, month, 1));
    }
  };

  // --- MONTH STATS CALCULATION ---
  const formattedMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthlyTrades = accountTrades.filter((t) => t.trade_date.startsWith(formattedMonthPrefix));

  const totalMonthlyTrades = monthlyTrades.length;
  const monthlyWins = monthlyTrades.filter((t) => Number(t.gain_loss) > 0);
  const monthlyLosses = monthlyTrades.filter((t) => Number(t.gain_loss) < 0);
  const monthlyWinRate = totalMonthlyTrades > 0 ? Math.round((monthlyWins.length / totalMonthlyTrades) * 100) : 0;
  const monthlyPnL = monthlyTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);

  // Group trades of this month by day
  const dailyTradesMap: Record<string, Trade[]> = {};
  monthlyTrades.forEach((t) => {
    dailyTradesMap[t.trade_date] = dailyTradesMap[t.trade_date] || [];
    dailyTradesMap[t.trade_date].push(t);
  });

  // Calculate best day of month
  let bestDayOfMonthStr = 'None';
  let bestDayProfit = -Infinity;
  Object.entries(dailyTradesMap).forEach(([dateStr, list]) => {
    const dayNet = list.reduce((sum, t) => sum + Number(t.gain_loss), 0);
    if (dayNet > bestDayProfit && dayNet > 0) {
      bestDayProfit = dayNet;
      bestDayOfMonthStr = dateStr;
    }
  });

  // Days list for grid
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysList: { dayNumber: number | null; dateString: string | null }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysList.push({ dayNumber: null, dateString: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    daysList.push({ dayNumber: i, dateString: formattedDate });
  }

  // --- YEAR STATS CALCULATION ---
  const yearlyTrades = accountTrades.filter((t) => t.trade_date.startsWith(`${year}-`));
  const totalYearlyTrades = yearlyTrades.length;
  const yearlyWins = yearlyTrades.filter((t) => Number(t.gain_loss) > 0);
  const yearlyLosses = yearlyTrades.filter((t) => Number(t.gain_loss) < 0);
  const yearlyWinRate = totalYearlyTrades > 0 ? Math.round((yearlyWins.length / totalYearlyTrades) * 100) : 0;
  const yearlyPnL = yearlyTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);

  // Best month of the year
  let bestMonthIndex = -1;
  let bestMonthPnL = -Infinity;
  for (let m = 0; m < 12; m++) {
    const mPrefix = `${year}-${String(m + 1).padStart(2, '0')}`;
    const mTrades = yearlyTrades.filter((t) => t.trade_date.startsWith(mPrefix));
    const mNet = mTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);
    if (mTrades.length > 0 && mNet > bestMonthPnL) {
      bestMonthPnL = mNet;
      bestMonthIndex = m;
    }
  }

  // Handle Image Export
  const handleDownloadPNG = async () => {
    if (!exportRef.current) return;
    setExportingImage(true);
    if (onAddToast) onAddToast('Rendering high-resolution calendar image...', 'info');

    try {
      // Small timeout to allow UI stabilization
      await new Promise((r) => setTimeout(r, 150));
      const el = exportRef.current;
      const width = Math.max(el.scrollWidth, 960);
      const height = el.scrollHeight;

      const dataUrl = await toPng(el, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#050507',
        width: width,
        height: height,
        style: {
          opacity: '1',
          visibility: 'visible',
          transform: 'none',
          margin: '0',
          padding: '32px',
          maxHeight: 'none',
          maxWidth: 'none',
          overflow: 'visible',
          width: `${width}px`,
          height: `${height}px`,
        },
      });

      const link = document.createElement('a');
      link.download = `bgmarif_Trading_Journal_${exportMode === 'month' ? `${monthNames[exportMonth]}_${exportYear}` : `Year_${exportYear}`}_Report.png`;
      link.href = dataUrl;
      link.click();

      if (onAddToast) onAddToast('Successfully downloaded calendar report image!', 'success');
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Failed to export image:', err);
      if (onAddToast) onAddToast('Failed to generate PNG export image.', 'error');
    } finally {
      setExportingImage(false);
    }
  };

  // Helper function to build monthly data for export or yearly view
  const getMonthStats = (targetYear: number, targetMonthIndex: number) => {
    const prefix = `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`;
    const tradesInMonth = accountTrades.filter((t) => t.trade_date.startsWith(prefix));
    const wins = tradesInMonth.filter((t) => Number(t.gain_loss) > 0);
    const losses = tradesInMonth.filter((t) => Number(t.gain_loss) < 0);
    const winRate = tradesInMonth.length > 0 ? Math.round((wins.length / tradesInMonth.length) * 100) : 0;
    const pnl = tradesInMonth.reduce((sum, t) => sum + Number(t.gain_loss), 0);

    // Build day map
    const dMap: Record<string, Trade[]> = {};
    tradesInMonth.forEach((t) => {
      dMap[t.trade_date] = dMap[t.trade_date] || [];
      dMap[t.trade_date].push(t);
    });

    // Days grid for this month
    const firstDay = new Date(targetYear, targetMonthIndex, 1).getDay();
    const totalDays = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
    const grid: { dayNum: number | null; dateStr: string | null }[] = [];
    for (let i = 0; i < firstDay; i++) {
      grid.push({ dayNum: null, dateStr: null });
    }
    for (let i = 1; i <= totalDays; i++) {
      const dStr = `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      grid.push({ dayNum: i, dateStr: dStr });
    }

    return {
      tradesInMonth,
      wins,
      losses,
      winRate,
      pnl,
      dMap,
      grid,
      totalDays,
    };
  };

  const currentExportMonthStats = getMonthStats(exportYear, exportMonth);
  const currentExportYearStats = Array.from({ length: 12 }, (_, idx) => getMonthStats(exportYear, idx));

  return (
    <div className="space-y-6">
      {/* Calendar layout header, view switcher, and export trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#09090b] border border-white/5 p-4 rounded-xl shadow-inner">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <CalendarIcon size={18} />
          </div>
          <div>
            <h2 className="text-md font-sans font-bold text-white leading-tight flex items-center gap-2">
              {viewMode === 'month' ? `${monthNames[month]} ${year}` : `Yearly Overview ${year}`}
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              Account Cluster: <span className="text-slate-300 font-semibold">{account.name}</span> •{' '}
              <span className="text-emerald-400 font-mono">
                {viewMode === 'month' ? `${totalMonthlyTrades} Monthly Trades` : `${totalYearlyTrades} Annual Trades`}
              </span>
            </p>
          </div>
        </div>

        {/* View Mode Toggle & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month vs Year Toggle */}
          <div className="flex items-center bg-[#050507] border border-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'month'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-view-mode-month"
            >
              <CalendarIcon size={12} />
              Month
            </button>
            <button
              onClick={() => setViewMode('year')}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'year'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              id="btn-view-mode-year"
            >
              <Layers size={12} />
              Year
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Month / Year Navigator */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="rounded-lg bg-[#050507] border border-white/5 p-2 text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
              id="btn-prev-period"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="rounded-lg bg-[#050507] border border-white/5 px-3 py-2 text-xs font-mono font-medium text-slate-300 hover:text-white hover:border-white/10 transition-all cursor-pointer"
              id="btn-today-period"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="rounded-lg bg-[#050507] border border-white/5 p-2 text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
              id="btn-next-period"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

          {/* Export Calendar Image Trigger */}
          <button
            onClick={() => {
              setExportMode(viewMode);
              setExportMonth(month);
              setExportYear(year);
              setShowExportModal(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-3.5 py-2 text-xs transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
            id="btn-open-export-modal"
          >
            <Download size={14} />
            <span>Export Image</span>
          </button>
        </div>
      </div>

      {/* --- MONTH VIEW RENDERING --- */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Heatmap Grid */}
          <div className="lg:col-span-3 bg-[#09090b] border border-white/5 rounded-2xl p-5 shadow-inner">
            <div className="grid grid-cols-7 text-center text-xs font-mono font-bold uppercase tracking-widest text-slate-500 mb-4 pb-2 border-b border-white/5">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {daysList.map((cell, idx) => {
                if (cell.dayNumber === null || cell.dateString === null) {
                  return (
                    <div key={`empty-${idx}`} className="aspect-square bg-[#050507]/20 rounded-lg border border-transparent" />
                  );
                }

                const dayTrades = dailyTradesMap[cell.dateString] || [];
                const dayPnL = dayTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);

                const winsCount = dayTrades.filter((t) => Number(t.gain_loss) > 0).length;
                const lossesCount = dayTrades.filter((t) => Number(t.gain_loss) < 0).length;

                // Color coding
                let dayBg = 'bg-[#050507]/40 border-white/5 hover:border-white/15 hover:bg-[#050507]/60 text-slate-400';
                let badgeColor = 'text-slate-600';

                if (dayTrades.length > 0) {
                  if (winsCount > 0 && lossesCount === 0) {
                    dayBg = 'bg-emerald-950/20 border-emerald-500/30 hover:bg-emerald-950/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.05)]';
                    badgeColor = 'text-emerald-400';
                  } else if (lossesCount > 0 && winsCount === 0) {
                    dayBg = 'bg-rose-950/20 border-rose-500/30 hover:bg-rose-950/40 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.05)]';
                    badgeColor = 'text-rose-400';
                  } else {
                    dayBg = 'bg-blue-950/20 border-blue-500/30 hover:bg-blue-950/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.05)]';
                    badgeColor = 'text-blue-400';
                  }
                }

                return (
                  <div
                    key={cell.dateString}
                    onClick={() => {
                      if (dayTrades.length > 0) {
                        setSelectedDayTrades({ date: cell.dateString!, trades: dayTrades });
                      }
                    }}
                    className={`aspect-square rounded-xl border p-1.5 sm:p-2.5 flex flex-col justify-between transition-all select-none cursor-pointer ${dayBg}`}
                  >
                    {/* Top row: day number + trade count */}
                    <div className="flex items-center justify-between gap-0.5 w-full">
                      <span className="text-[11px] sm:text-xs font-mono font-bold leading-none">{cell.dayNumber}</span>
                      {dayTrades.length > 0 && (
                        <span className={`text-[8px] sm:text-[9.5px] font-mono font-black px-1 py-0.5 rounded bg-white/5 leading-none ${badgeColor}`}>
                          {winsCount}W • {lossesCount}L
                        </span>
                      )}
                    </div>

                    {/* Middle row: Trade symbols ticker */}
                    {dayTrades.length > 0 && (
                      <div className="hidden sm:flex flex-col gap-0.5 my-1 overflow-hidden">
                        {dayTrades.slice(0, 2).map((tr) => {
                          const trWin = Number(tr.gain_loss) > 0;
                          const dir = tr.direction || 'BUY';
                          return (
                            <div key={tr.id} className="text-[8px] font-mono font-semibold truncate flex items-center gap-1 text-slate-300 bg-black/40 px-1 py-0.5 rounded">
                              <span className={trWin ? 'text-emerald-400' : 'text-rose-400'}>{trWin ? '▲' : '▼'}</span>
                              <span className="font-bold">{dir}</span> {tr.pair}
                            </div>
                          );
                        })}
                        {dayTrades.length > 2 && (
                          <div className="text-[7.5px] font-mono text-slate-500 text-center">
                            +{dayTrades.length - 2} more...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom row: Daily profit/loss */}
                    {dayTrades.length > 0 && (
                      <div
                        className="text-[9px] sm:text-[11.5px] font-black font-mono tracking-tighter text-right leading-none mt-auto pt-1 truncate w-full"
                        title={dayPnL >= 0 ? `+$${dayPnL.toFixed(2)}` : `-$${Math.abs(dayPnL).toFixed(2)}`}
                      >
                        {dayPnL >= 0 ? '+' : ''}${dayPnL.toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center flex-wrap gap-4 mt-6 pt-4 border-t border-white/5 text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]" /> All Wins
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-rose-950/20 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.2)]" /> All Losses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-blue-950/20 border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.2)]" /> Mixed Results
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-[#050507]/40 border border-white/5" /> No Trades
              </span>
            </div>
          </div>

          {/* Monthly statistics column */}
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1.5">
              <BarChart3 size={14} className="text-emerald-400" />
              Monthly Performance
            </h3>

            <div className="space-y-4 bg-[#09090b] border border-white/5 rounded-2xl p-5 shadow-inner">
              {/* Total Trades & Record */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Trades</div>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">{totalMonthlyTrades}</div>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="text-emerald-400 font-bold">{monthlyWins.length}W</span> •{' '}
                  <span className="text-rose-400 font-bold">{monthlyLosses.length}L</span>
                </div>
              </div>

              {/* Monthly Win Rate */}
              <div className="border-b border-white/5 pb-3">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Win Rate</div>
                <div className="text-xl font-bold text-emerald-400 font-mono">{monthlyWinRate}%</div>
                <div className="w-full bg-[#050507] h-1.5 rounded-full overflow-hidden mt-1.5 border border-white/5">
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all" style={{ width: `${monthlyWinRate}%` }} />
                </div>
              </div>

              {/* Monthly P&L */}
              <div className="border-b border-white/5 pb-3">
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Monthly Net P&L</div>
                <div className={`text-xl font-bold font-mono ${monthlyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {monthlyPnL >= 0 ? '+' : ''}${monthlyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              {/* Best Trading Day of Month */}
              <div>
                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Best Trading Day</div>
                <div className="text-sm font-semibold text-white font-mono">
                  {bestDayOfMonthStr === 'None' ? 'N/A' : bestDayOfMonthStr}
                </div>
                {bestDayOfMonthStr !== 'None' && (
                  <div className="text-[10px] font-mono text-emerald-400 mt-0.5 font-bold">
                    +${bestDayProfit.toFixed(2)} Net profit
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- YEAR VIEW RENDERING --- */}
      {viewMode === 'year' && (
        <div className="space-y-6">
          {/* Annual Summary Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#09090b] border border-white/5 rounded-2xl p-4 sm:p-5">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Annual Net P&L</span>
              <span className={`text-xl sm:text-2xl font-bold font-mono ${yearlyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {yearlyPnL >= 0 ? '+' : ''}${yearlyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Annual Win Rate</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">{yearlyWinRate}%</span>
              <span className="text-[10px] font-mono text-slate-500 block">{yearlyWins.length}W • {yearlyLosses.length}L</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Total Year Trades</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white">{totalYearlyTrades}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Best Annual Month</span>
              <span className="text-base sm:text-lg font-bold text-white font-sans uppercase">
                {bestMonthIndex >= 0 ? monthNames[bestMonthIndex] : 'N/A'}
              </span>
              {bestMonthIndex >= 0 && (
                <span className="text-[10px] font-mono text-emerald-400 font-bold block">
                  +${bestMonthPnL.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* 12-Month Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, mIdx) => {
              const mStats = getMonthStats(year, mIdx);
              const isCurrentMonth = year === new Date().getFullYear() && mIdx === new Date().getMonth();

              return (
                <div
                  key={mIdx}
                  onClick={() => {
                    setCurrentDate(new Date(year, mIdx, 1));
                    setViewMode('month');
                  }}
                  className={`bg-[#09090b] border rounded-2xl p-4 transition-all cursor-pointer hover:border-emerald-500/40 flex flex-col justify-between shadow-inner ${
                    isCurrentMonth ? 'border-emerald-500/30 bg-gradient-to-b from-emerald-950/10 to-[#09090b]' : 'border-white/5 hover:bg-[#050507]/40'
                  }`}
                >
                  {/* Month Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white uppercase font-sans tracking-wide flex items-center gap-1.5">
                        {monthNames[mIdx]}
                        {isCurrentMonth && (
                          <span className="text-[8px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.2 rounded">
                            CURRENT
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500">
                        {mStats.tradesInMonth.length} Trades • {mStats.winRate}% WR
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-bold ${mStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {mStats.pnl >= 0 ? '+' : ''}${mStats.pnl.toFixed(2)}
                      </span>
                      <div className="text-[9px] font-mono text-slate-500">
                        {mStats.wins.length}W • {mStats.losses.length}L
                      </div>
                    </div>
                  </div>

                  {/* Mini Calendar Heatmap Grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {mStats.grid.map((cell, cIdx) => {
                      if (cell.dayNum === null || cell.dateStr === null) {
                        return <div key={`empty-yr-${cIdx}`} className="aspect-square rounded bg-transparent" />;
                      }

                      const dTrades = mStats.dMap[cell.dateStr] || [];
                      const wCnt = dTrades.filter((t) => Number(t.gain_loss) > 0).length;
                      const lCnt = dTrades.filter((t) => Number(t.gain_loss) < 0).length;

                      let cellBg = 'bg-[#050507]/60 border border-white/5 text-slate-600';
                      if (dTrades.length > 0) {
                        if (wCnt > 0 && lCnt === 0) cellBg = 'bg-emerald-500 text-black font-black shadow-[0_0_6px_rgba(16,185,129,0.3)]';
                        else if (lCnt > 0 && wCnt === 0) cellBg = 'bg-rose-500 text-white font-black shadow-[0_0_6px_rgba(244,63,94,0.3)]';
                        else cellBg = 'bg-blue-500 text-white font-black shadow-[0_0_6px_rgba(59,130,246,0.3)]';
                      }

                      return (
                        <div
                          key={cell.dateStr}
                          className={`aspect-square rounded text-[8px] font-mono flex items-center justify-center transition-all ${cellBg}`}
                          title={`${cell.dateStr}: ${dTrades.length} trades`}
                        >
                          {cell.dayNum}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-500 group-hover:text-emerald-400">
                    <span>Click to open full month</span>
                    <span>→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- CLICK DAY MODAL --- */}
      {selectedDayTrades && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 select-none">
          <div className="w-full max-w-2xl bg-[#09090b] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-emerald-400" />
                <span className="text-sm font-bold text-white font-mono">Trades on {selectedDayTrades.date}</span>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                  {selectedDayTrades.trades.length} Trades
                </span>
              </div>
              <button
                onClick={() => setSelectedDayTrades(null)}
                className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                id="btn-calendar-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 scrollbar-none">
              {selectedDayTrades.trades.map((trade) => {
                const isWin = Number(trade.gain_loss) > 0;
                const dir = trade.direction || 'BUY';
                return (
                  <div
                    key={trade.id}
                    className="p-3.5 rounded-xl bg-[#050507]/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-white/10 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          dir === 'BUY'
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                        }`}>
                          {dir}
                        </span>
                        <span className="text-xs font-bold text-white uppercase tracking-tight">{trade.pair}</span>
                        <span className="rounded-full bg-[#09090b] border border-white/5 px-2 py-0.5 text-[9px] font-mono text-slate-400">
                          {trade.setup_type}
                        </span>
                        <span className="rounded-full bg-[#09090b] border border-white/5 px-2 py-0.5 text-[9px] font-mono text-slate-400">
                          {trade.session}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 mt-1 flex gap-3">
                        <span>R:R: {trade.rr_ratio || '1:1'}</span>
                        {trade.images && trade.images.length > 0 && (
                          <span className="text-emerald-400 flex items-center gap-0.5 font-bold">
                            • {trade.images.length} Image(s)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`text-sm font-bold font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${Number(trade.gain_loss).toFixed(2)}
                      </span>

                      <button
                        onClick={() => {
                          setSelectedDayTrades(null);
                          onOpenTradeDetails(trade);
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-[#09090b] border border-white/5 hover:border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-all shadow-inner cursor-pointer"
                        id={`btn-calendar-view-trade-${trade.id}`}
                      >
                        <Eye size={12} />
                        Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- EXPORT STUDIO MODAL & LIVE PREVIEW --- */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-2 sm:px-4 select-none">
          <div className="w-full max-w-5xl bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh]">
            {/* Modal Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 p-3.5 sm:p-4 bg-[#050507] gap-3">
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                    <Download size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      Calendar Export Studio
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Generate publication-grade monthly or annual trading reports
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer md:hidden"
                  id="btn-close-export-modal-mobile"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Timeframe & Mode Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Switch between Monthly / Yearly Export */}
                <div className="flex items-center bg-black border border-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setExportMode('month')}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      exportMode === 'month'
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    id="btn-export-mode-month"
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setExportMode('year')}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                      exportMode === 'year'
                        ? 'bg-emerald-500 text-zinc-950 font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    id="btn-export-mode-year"
                  >
                    Yearly
                  </button>
                </div>

                {/* Month Dropdown (if Monthly mode) */}
                {exportMode === 'month' && (
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(Number(e.target.value))}
                    className="bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    id="select-export-month"
                  >
                    {monthNames.map((mName, mI) => (
                      <option key={mI} value={mI}>
                        {mName}
                      </option>
                    ))}
                  </select>
                )}

                {/* Year Dropdown */}
                <select
                  value={exportYear}
                  onChange={(e) => setExportYear(Number(e.target.value))}
                  className="bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  id="select-export-year"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer hidden md:block"
                  id="btn-close-export-modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* --- HIDDEN / OFF-SCREEN 960px TARGET FOR HIGH-RES PNG EXPORT --- */}
            <div className="fixed left-0 top-0 pointer-events-none opacity-0 z-[-100] overflow-visible w-[960px]">
              <div
                ref={exportRef}
                className="w-[960px] min-w-[960px] bg-[#050507] border border-white/10 rounded-2xl p-6 sm:p-8 space-y-6 text-slate-200 shadow-2xl relative font-sans shrink-0"
              >
                {/* Decorative top accent */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 rounded-t-2xl" />

                {/* HEADER ROW OF THE EXPORT REPORT */}
                <div className="flex items-center justify-between border-b border-white/10 pb-5">
                  <div>
                    <div className="text-xs font-mono font-bold tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      bgmarif Trading Journal
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase mt-1">
                      {exportMode === 'month' ? `${monthNames[exportMonth]} ${exportYear}` : `ANNUAL TRADING LEDGER ${exportYear}`}
                    </h1>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">
                      Account: <span className="text-white font-bold">{account.name}</span> • Instrument: <span className="text-emerald-400 font-bold">{account.instrument}</span>
                    </p>
                  </div>

                  {/* Summary Metric Badges in Header */}
                  <div className="flex items-center gap-4 text-right font-mono">
                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase block">Net P&L</span>
                      <span className={`text-lg font-black ${
                        (exportMode === 'month' ? currentExportMonthStats.pnl : yearlyPnL) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(exportMode === 'month' ? currentExportMonthStats.pnl : yearlyPnL) >= 0 ? '+' : ''}$
                        {(exportMode === 'month' ? currentExportMonthStats.pnl : yearlyPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase block">Win Rate & Record</span>
                      <span className="text-lg font-black text-emerald-400">
                        {exportMode === 'month' ? currentExportMonthStats.winRate : yearlyWinRate}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-bold">
                        {exportMode === 'month' ? `${currentExportMonthStats.wins.length}W • ${currentExportMonthStats.losses.length}L` : `${yearlyWins.length}W • ${yearlyLosses.length}L`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* --- IF MONTHLY EXPORT MODE --- */}
                {exportMode === 'month' && (
                  <div className="space-y-6">
                    {/* 7-Col Heatmap Grid */}
                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-4">
                      <div className="grid grid-cols-7 text-center text-xs font-mono font-bold uppercase tracking-widest text-slate-500 mb-3 pb-2 border-b border-white/5">
                        <div>Sun</div>
                        <div>Mon</div>
                        <div>Tue</div>
                        <div>Wed</div>
                        <div>Thu</div>
                        <div>Fri</div>
                        <div>Sat</div>
                      </div>

                      <div className="grid grid-cols-7 gap-2">
                        {currentExportMonthStats.grid.map((cell, idx) => {
                          if (cell.dayNum === null || cell.dateStr === null) {
                            return <div key={`exp-emp-${idx}`} className="aspect-square bg-[#050507]/20 rounded-lg border border-transparent" />;
                          }

                          const dTrades = currentExportMonthStats.dMap[cell.dateStr] || [];
                          const dPnL = dTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);
                          const wCnt = dTrades.filter((t) => Number(t.gain_loss) > 0).length;
                          const lCnt = dTrades.filter((t) => Number(t.gain_loss) < 0).length;

                          let cellBg = 'bg-[#050507]/60 border-white/5 text-slate-400';
                          if (dTrades.length > 0) {
                            if (wCnt > 0 && lCnt === 0) cellBg = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300';
                            else if (lCnt > 0 && wCnt === 0) cellBg = 'bg-rose-950/30 border-rose-500/40 text-rose-300';
                            else cellBg = 'bg-blue-950/30 border-blue-500/40 text-blue-300';
                          }

                          return (
                            <div
                              key={cell.dateStr}
                              className={`rounded-xl border p-2 flex flex-col justify-between ${cellBg}`}
                              style={{ minHeight: '110px' }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono font-bold">{cell.dayNum}</span>
                                {dTrades.length > 0 && (
                                  <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-black/50">
                                    {wCnt}W {lCnt}L
                                  </span>
                                )}
                              </div>

                              {/* Trade Symbol & Direction Tickers inside calendar box */}
                              {dTrades.length > 0 && (
                                <div className="flex flex-col gap-1 my-1 overflow-hidden">
                                  {dTrades.slice(0, 3).map((tr) => {
                                    const trWin = Number(tr.gain_loss) > 0;
                                    const dir = tr.direction || 'BUY';
                                    return (
                                      <div key={tr.id} className="text-[8.5px] font-mono font-semibold truncate flex items-center justify-between bg-black/60 px-1.5 py-0.5 rounded">
                                        <span className="truncate">
                                          <span className={trWin ? 'text-emerald-400' : 'text-rose-400'}>{trWin ? '▲' : '▼'}</span> {dir} {tr.pair}
                                        </span>
                                        <span className={`font-bold ${trWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {trWin ? '+' : ''}${Number(tr.gain_loss).toFixed(0)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                  {dTrades.length > 3 && (
                                    <div className="text-[7.5px] font-mono text-slate-500 text-center">
                                      +{dTrades.length - 3} more
                                    </div>
                                  )}
                                </div>
                              )}

                              {dTrades.length > 0 && (
                                <div className="text-xs font-black font-mono tracking-tighter text-right mt-auto pt-1 border-t border-white/5">
                                  {dPnL >= 0 ? '+' : ''}${dPnL.toFixed(2)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Trade Ledger Table inside the export so EVERY info is visible */}
                    {currentExportMonthStats.tradesInMonth.length > 0 && (
                      <div className="bg-[#09090b] border border-white/10 rounded-xl p-4">
                        <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          Monthly Verified Trade Log ({currentExportMonthStats.tradesInMonth.length} Executions)
                        </h4>
                        <div className="overflow-hidden rounded-lg border border-white/5">
                          <table className="w-full text-left font-mono text-[10px]">
                            <thead>
                              <tr className="bg-[#050507] text-slate-400 uppercase border-b border-white/5">
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Type</th>
                                <th className="p-2.5">Pair</th>
                                <th className="p-2.5">Setup</th>
                                <th className="p-2.5">Session</th>
                                <th className="p-2.5">R:R</th>
                                <th className="p-2.5 text-right">Net P&L</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {currentExportMonthStats.tradesInMonth
                                .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
                                .map((t) => {
                                  const tWin = Number(t.gain_loss) > 0;
                                  const dir = t.direction || 'BUY';
                                  return (
                                    <tr key={t.id} className="bg-[#09090b]/40">
                                      <td className="p-2.5 text-slate-300">{t.trade_date}</td>
                                      <td className="p-2.5">
                                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                                          dir === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                                        }`}>
                                          {dir}
                                        </span>
                                      </td>
                                      <td className="p-2.5 text-white font-bold">{t.pair}</td>
                                      <td className="p-2.5 text-slate-400">{t.setup_type}</td>
                                      <td className="p-2.5 text-slate-400">{t.session}</td>
                                      <td className="p-2.5 text-slate-400">{t.rr_ratio || '1:1'}</td>
                                      <td className={`p-2.5 text-right font-bold ${tWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tWin ? '+' : ''}${Number(t.gain_loss).toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- IF YEARLY EXPORT MODE --- */}
                {exportMode === 'year' && (
                  <div className="space-y-6">
                    {/* 12 Months Heatmap Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {currentExportYearStats.map((mStats, mIdx) => (
                        <div key={mIdx} className="bg-[#09090b] border border-white/10 rounded-xl p-3">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                            <div>
                              <div className="text-xs font-bold text-white uppercase">{monthNames[mIdx]}</div>
                              <div className="text-[9px] font-mono text-slate-400">
                                {mStats.tradesInMonth.length} Trades • {mStats.winRate}% WR
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <div className={`text-xs font-bold ${mStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {mStats.pnl >= 0 ? '+' : ''}${mStats.pnl.toFixed(2)}
                              </div>
                              <div className="text-[8.5px] text-slate-400 font-bold">
                                {mStats.wins.length}W • {mStats.losses.length}L
                              </div>
                            </div>
                          </div>

                          {/* Mini 7-Col Calendar Grid */}
                          <div className="grid grid-cols-7 gap-1">
                            {mStats.grid.map((cell, cIdx) => {
                              if (cell.dayNum === null || cell.dateStr === null) {
                                return <div key={`exp-yr-emp-${cIdx}`} className="aspect-square rounded bg-transparent" />;
                              }

                              const dTrades = mStats.dMap[cell.dateStr] || [];
                              const wCnt = dTrades.filter((t) => Number(t.gain_loss) > 0).length;
                              const lCnt = dTrades.filter((t) => Number(t.gain_loss) < 0).length;

                              let cellBg = 'bg-[#050507] border border-white/5 text-slate-600';
                              if (dTrades.length > 0) {
                                if (wCnt > 0 && lCnt === 0) cellBg = 'bg-emerald-500 text-black font-black';
                                else if (lCnt > 0 && wCnt === 0) cellBg = 'bg-rose-500 text-white font-black';
                                else cellBg = 'bg-blue-500 text-white font-black';
                              }

                              return (
                                <div
                                  key={cell.dateStr}
                                  className={`aspect-square rounded text-[7.5px] font-mono flex items-center justify-center ${cellBg}`}
                                >
                                  {cell.dayNum}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Annual Monthly Summary Table */}
                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-4">
                      <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest mb-3">
                        Annual Monthly Breakdown Log ({exportYear})
                      </h4>
                      <table className="w-full text-left font-mono text-[10px]">
                        <thead>
                          <tr className="bg-[#050507] text-slate-400 uppercase border-b border-white/5">
                            <th className="p-2">Month</th>
                            <th className="p-2">Total Trades</th>
                            <th className="p-2">Wins</th>
                            <th className="p-2">Losses</th>
                            <th className="p-2">Win Rate</th>
                            <th className="p-2 text-right">Monthly P&L</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {currentExportYearStats.map((st, i) => (
                            <tr key={i} className="bg-[#09090b]/30">
                              <td className="p-2 text-white font-bold">{monthNames[i]}</td>
                              <td className="p-2 text-slate-300">{st.tradesInMonth.length}</td>
                              <td className="p-2 text-emerald-400 font-bold">{st.wins.length}</td>
                              <td className="p-2 text-rose-400 font-bold">{st.losses.length}</td>
                              <td className="p-2 text-slate-300">{st.winRate}%</td>
                              <td className={`p-2 text-right font-bold ${st.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {st.pnl >= 0 ? '+' : ''}${st.pnl.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Footer Stamp */}
                <div className="border-t border-white/10 pt-4 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Generated by bgmarif Trading Journal</span>
                  <span>Date: {new Date().toLocaleDateString()} • Verified Cloud Cluster</span>
                </div>
              </div>
            </div>

            {/* --- VISIBLE MODAL UI (100% Responsive & Fit-to-Screen) --- */}
            <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 bg-black/60 space-y-4 sm:space-y-6 w-full">
              {/* Responsive Summary Banner */}
              <div className="bg-[#050507] border border-white/10 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="text-[10px] sm:text-xs font-mono font-bold tracking-widest text-emerald-400 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      bgmarif Trading Journal
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight uppercase mt-1">
                      {exportMode === 'month' ? `${monthNames[exportMonth]} ${exportYear}` : `ANNUAL TRADING LEDGER ${exportYear}`}
                    </h2>
                    <p className="text-[10px] sm:text-xs font-mono text-slate-400 mt-0.5">
                      Account: <span className="text-white font-bold">{account.name}</span> • Instrument: <span className="text-emerald-400 font-bold">{account.instrument}</span>
                    </p>
                  </div>

                  {/* Responsive Stat Badges */}
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-left sm:text-right font-mono">
                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-2.5 sm:p-3">
                      <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">Net P&L</span>
                      <span className={`text-base sm:text-lg font-black ${
                        (exportMode === 'month' ? currentExportMonthStats.pnl : yearlyPnL) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {(exportMode === 'month' ? currentExportMonthStats.pnl : yearlyPnL) >= 0 ? '+' : ''}$
                        {(exportMode === 'month' ? currentExportMonthStats.pnl : yearlyPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-2.5 sm:p-3">
                      <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase block">Win Rate & Record</span>
                      <span className="text-base sm:text-lg font-black text-emerald-400">
                        {exportMode === 'month' ? currentExportMonthStats.winRate : yearlyWinRate}%
                      </span>
                      <span className="text-[9px] sm:text-[10px] text-slate-400 block font-bold">
                        {exportMode === 'month' ? `${currentExportMonthStats.wins.length}W • ${currentExportMonthStats.losses.length}L` : `${yearlyWins.length}W • ${yearlyLosses.length}L`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fit-to-Screen Heatmap Grid Preview */}
                {exportMode === 'month' ? (
                  <div className="space-y-4">
                    <div className="bg-[#09090b] border border-white/10 rounded-xl p-3 sm:p-4">
                      <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest text-slate-500 mb-2 sm:mb-3 pb-2 border-b border-white/5">
                        <div>Su</div>
                        <div>Mo</div>
                        <div>Tu</div>
                        <div>We</div>
                        <div>Th</div>
                        <div>Fr</div>
                        <div>Sa</div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {currentExportMonthStats.grid.map((cell, idx) => {
                          if (cell.dayNum === null || cell.dateStr === null) {
                            return <div key={`prev-emp-${idx}`} className="aspect-square bg-[#050507]/20 rounded-lg border border-transparent" />;
                          }
                          const dTrades = currentExportMonthStats.dMap[cell.dateStr] || [];
                          const dPnL = dTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);
                          const wCnt = dTrades.filter((t) => Number(t.gain_loss) > 0).length;
                          const lCnt = dTrades.filter((t) => Number(t.gain_loss) < 0).length;

                          let cellBg = 'bg-[#050507]/60 border-white/5 text-slate-400';
                          if (dTrades.length > 0) {
                            if (wCnt > 0 && lCnt === 0) cellBg = 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300';
                            else if (lCnt > 0 && wCnt === 0) cellBg = 'bg-rose-950/30 border-rose-500/40 text-rose-300';
                            else cellBg = 'bg-blue-950/30 border-blue-500/40 text-blue-300';
                          }

                          return (
                            <div
                              key={`prev-${cell.dateStr}`}
                              className={`rounded-lg sm:rounded-xl border p-1 sm:p-2 flex flex-col justify-between ${cellBg}`}
                              style={{ minHeight: '52px' }}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] sm:text-xs font-mono font-bold">{cell.dayNum}</span>
                                {dTrades.length > 0 && (
                                  <span className="text-[8px] sm:text-[9px] font-mono font-black px-1 py-0.5 rounded bg-black/50 hidden sm:inline">
                                    {dTrades.length}T
                                  </span>
                                )}
                              </div>
                              {dTrades.length > 0 && (
                                <div className="text-[9px] sm:text-xs font-black font-mono tracking-tighter text-right mt-auto pt-0.5 border-t border-white/5">
                                  {dPnL >= 0 ? '+' : ''}${dPnL.toFixed(0)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {currentExportMonthStats.tradesInMonth.length > 0 && (
                      <div className="bg-[#09090b] border border-white/10 rounded-xl p-3 sm:p-4 font-mono text-xs text-slate-400">
                        <div className="flex items-center justify-between">
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            Full Trade Ledger Included ({currentExportMonthStats.tradesInMonth.length} Executions)
                          </span>
                          <span className="text-[10px] text-slate-500">100% unclipped in downloaded PNG</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {currentExportYearStats.map((mStats, mIdx) => (
                      <div key={`prev-yr-${mIdx}`} className="bg-[#09090b] border border-white/10 rounded-xl p-3 font-mono">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white uppercase">{monthNames[mIdx]}</span>
                          <span className={`text-xs font-bold ${mStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {mStats.pnl >= 0 ? '+' : ''}${mStats.pnl.toFixed(0)}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {mStats.tradesInMonth.length} Trades • {mStats.winRate}% WR
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Bottom Bar Action */}
            <div className="p-3.5 sm:p-4 bg-[#050507] border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-xs font-mono text-slate-400 text-center sm:text-left">
                Ready to export <span className="text-white font-bold">{exportMode === 'month' ? `${monthNames[exportMonth]} ${exportYear}` : `Year ${exportYear}`}</span> report as high-resolution PNG image.
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-slate-300 hover:text-white transition-all cursor-pointer text-center"
                  id="btn-cancel-export"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadPNG}
                  disabled={exportingImage}
                  className="flex-2 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                  id="btn-confirm-download-png"
                >
                  {exportingImage ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Generating PNG...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Download PNG Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
