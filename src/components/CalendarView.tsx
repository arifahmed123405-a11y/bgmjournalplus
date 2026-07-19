import React, { useState } from 'react';
import { Account, Trade } from '../types';
import { ChevronLeft, ChevronRight, Calendar, Award, CheckCircle2, AlertCircle, Sparkles, X, Eye } from 'lucide-react';

interface CalendarViewProps {
  account: Account | null;
  trades: Trade[];
  onOpenTradeDetails: (trade: Trade) => void;
}

export default function CalendarView({ account, trades, onOpenTradeDetails }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDayTrades, setSelectedDayTrades] = useState<{ date: string; trades: Trade[] } | null>(null);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
          <Calendar size={24} />
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

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Get days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 6 = Saturday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Month stats calculation
  const formattedMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthlyTrades = accountTrades.filter((t) => t.trade_date.startsWith(formattedMonthPrefix));

  const totalMonthlyTrades = monthlyTrades.length;
  const monthlyWins = monthlyTrades.filter((t) => Number(t.gain_loss) > 0);
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
  const daysList: { dayNumber: number | null; dateString: string | null }[] = [];
  // Blank cells at start
  for (let i = 0; i < firstDayOfMonth; i++) {
    daysList.push({ dayNumber: null, dateString: null });
  }
  // Month days
  for (let i = 1; i <= daysInMonth; i++) {
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    daysList.push({ dayNumber: i, dateString: formattedDate });
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="space-y-6">
      {/* Calendar layout header and switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#09090b] border border-white/5 p-4 rounded-xl shadow-inner">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
            <Calendar size={18} />
          </div>
          <div>
            <h2 className="text-md font-sans font-bold text-white leading-tight">
              {monthNames[month]} {year}
            </h2>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              Account Cluster: <span className="text-slate-300 font-semibold">{account.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="rounded-lg bg-[#050507] border border-white/5 p-2 text-slate-400 hover:text-white hover:border-white/10 transition-all"
            id="btn-prev-month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg bg-[#050507] border border-white/5 px-3 py-2 text-xs font-mono font-medium text-slate-300 hover:text-white hover:border-white/10 transition-all"
            id="btn-today"
          >
            Today
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-lg bg-[#050507] border border-white/5 p-2 text-slate-400 hover:text-white hover:border-white/10 transition-all"
            id="btn-next-month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

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

          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {daysList.map((cell, idx) => {
              if (cell.dayNumber === null || cell.dateString === null) {
                return (
                  <div key={`empty-${idx}`} className="aspect-square bg-[#050507]/20 rounded-lg border border-transparent" />
                );
              }

              const dayTrades = dailyTradesMap[cell.dateString] || [];
              const dayPnL = dayTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);

              const winsCount = dayTrades.filter(t => Number(t.gain_loss) > 0).length;
              const lossesCount = dayTrades.filter(t => Number(t.gain_loss) < 0).length;

              // Color coding
              let dayBg = 'bg-[#050507]/40 border-white/5 hover:border-white/10 hover:bg-[#050507]/60 text-slate-400';
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
                  className={`aspect-square rounded-lg border p-1 sm:p-2 flex flex-col justify-between transition-all select-none cursor-pointer ${dayBg}`}
                >
                  {/* Top row: day number + trade count */}
                  <div className="flex items-center justify-between gap-0.5 w-full">
                    <span className="text-[10px] sm:text-xs font-mono font-bold leading-none">{cell.dayNumber}</span>
                    {dayTrades.length > 0 && (
                      <span className={`text-[8px] sm:text-[9px] font-mono font-black px-0.5 sm:px-1 py-0.5 rounded bg-white/5 leading-none ${badgeColor}`}>
                        {dayTrades.length}T
                      </span>
                    )}
                  </div>

                  {/* Bottom row: Daily profit/loss */}
                  {dayTrades.length > 0 && (
                    <div className="text-[8px] xs:text-[9.5px] sm:text-[11px] font-black font-mono tracking-tighter text-right leading-none mt-auto pt-1 truncate w-full" title={dayPnL >= 0 ? `+$${dayPnL.toFixed(2)}` : `-$${Math.abs(dayPnL).toFixed(2)}`}>
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
          <h3 className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest">
            Monthly Statistics
          </h3>

          <div className="space-y-4 bg-[#09090b] border border-white/5 rounded-2xl p-5 shadow-inner">
            {/* Total Trades */}
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Total Trades</div>
              <div className="text-xl font-bold text-white font-mono">{totalMonthlyTrades}</div>
            </div>

            {/* Monthly Win Rate */}
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Monthly Win Rate</div>
              <div className="text-xl font-bold text-emerald-400 font-mono">{monthlyWinRate}%</div>
              <div className="text-[9px] font-mono text-slate-600 mt-0.5">
                {monthlyWins.length} winning entries
              </div>
            </div>

            {/* Monthly P&L */}
            <div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Monthly Net P&L</div>
              <div className={`text-xl font-bold font-mono ${monthlyPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {monthlyPnL >= 0 ? '+' : ''}${monthlyPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            {/* Best Trading Day of Month */}
            <div className="pt-3 border-t border-white/5">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">Best Trading Day</div>
              <div className="text-sm font-semibold text-white">
                {bestDayOfMonthStr === 'None' ? 'N/A' : bestDayOfMonthStr}
              </div>
              {bestDayOfMonthStr !== 'None' && (
                <div className="text-[9px] font-mono text-emerald-400 mt-0.5 font-bold">
                  +${bestDayProfit.toFixed(2)} Net profit
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click Day Modal */}
      {selectedDayTrades && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 select-none">
          <div className="w-full max-w-2xl bg-[#09090b] border border-white/5 rounded-xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-emerald-400" />
                <span className="text-sm font-bold text-white">Trades on {selectedDayTrades.date}</span>
                <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400">
                  {selectedDayTrades.trades.length} Trades
                </span>
              </div>
              <button
                onClick={() => setSelectedDayTrades(null)}
                className="text-slate-500 hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
                id="btn-calendar-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3 scrollbar-none">
              {selectedDayTrades.trades.map((trade) => {
                const isWin = Number(trade.gain_loss) > 0;
                return (
                  <div
                    key={trade.id}
                    className="p-3.5 rounded-xl bg-[#050507]/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-white/10 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
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
                        className="flex items-center gap-1.5 rounded-lg bg-[#09090b] border border-white/5 hover:border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-all shadow-inner"
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
    </div>
  );
}
