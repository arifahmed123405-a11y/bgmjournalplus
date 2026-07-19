import React, { useState } from 'react';
import { Account, Trade, SETUP_TYPES, TRADING_PAIRS } from '../types';
import { Filter, RotateCcw, Calendar, TrendingUp, DollarSign, ArrowUpDown, ShieldAlert } from 'lucide-react';

interface AnalysisViewProps {
  account: Account | null;
  trades: Trade[];
}

export default function AnalysisView({ account, trades }: AnalysisViewProps) {
  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon=1, Tue=2, Wed=3, Thu=4, Fri=5

  // Sorted Tables State
  const [pairSortDesc, setPairSortDesc] = useState(true);
  const [setupSortDesc, setSetupSortDesc] = useState(true);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
          <TrendingUp size={24} />
        </div>
        <h3 className="text-md font-medium text-white mb-1">No Trading Account Selected</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Please select or create a trading account from the top bar to run advanced performance metrics.
        </p>
      </div>
    );
  }

  // Filter trades for the selected account
  const accountTrades = trades.filter((t) => t.account_id === account.id);

  // Apply filters on trades
  const filteredTrades = accountTrades.filter((t) => {
    // 1. Date Range Filter
    if (startDate && new Date(t.trade_date) < new Date(startDate)) return false;
    if (endDate && new Date(t.trade_date) > new Date(endDate)) return false;

    // 2. Day of Week Filter
    // Date.getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const dayIndex = new Date(t.trade_date).getDay();
    if (dayIndex === 0 || dayIndex === 6) {
      // Weekend (unusual for Forex/Indices, but check if they added weekend)
      return true; // allow weekend trades regardless, or filter if days are selected
    }
    if (!selectedDays.includes(dayIndex)) {
      return false;
    }

    return true;
  });

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  // Helper to calculate session performance
  const getSessionStats = (sessionName: string) => {
    const sessionTrades = filteredTrades.filter((t) =>
      t.session.toLowerCase().includes(sessionName.toLowerCase())
    );
    const total = sessionTrades.length;
    const wins = sessionTrades.filter((t) => Number(t.gain_loss) > 0).length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const pnl = sessionTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);
    return { total, winRate, pnl };
  };

  const asianStats = getSessionStats('Asian');
  const londonStats = getSessionStats('London');
  const nyStats = getSessionStats('New York');

  // Pair Performance calculations
  const pairStatsMap: Record<string, { total: number; wins: number; pnl: number }> = {};
  filteredTrades.forEach((t) => {
    if (!pairStatsMap[t.pair]) {
      pairStatsMap[t.pair] = { total: 0, wins: 0, pnl: 0 };
    }
    const stat = pairStatsMap[t.pair];
    stat.total++;
    if (Number(t.gain_loss) > 0) stat.wins++;
    stat.pnl += Number(t.gain_loss);
  });

  const pairPerformances = Object.entries(pairStatsMap)
    .map(([pair, stats]) => ({
      pair,
      total: stats.total,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
      pnl: stats.pnl,
    }))
    .sort((a, b) => (pairSortDesc ? b.pnl - a.pnl : a.pnl - b.pnl));

  // Setup Performance calculations
  const setupStatsMap: Record<string, { total: number; wins: number; pnl: number }> = {};
  filteredTrades.forEach((t) => {
    if (!setupStatsMap[t.setup_type]) {
      setupStatsMap[t.setup_type] = { total: 0, wins: 0, pnl: 0 };
    }
    const stat = setupStatsMap[t.setup_type];
    stat.total++;
    if (Number(t.gain_loss) > 0) stat.wins++;
    stat.pnl += Number(t.gain_loss);
  });

  const setupPerformances = Object.entries(setupStatsMap)
    .map(([setup, stats]) => ({
      setup,
      total: stats.total,
      winRate: stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0,
      pnl: stats.pnl,
    }))
    .sort((a, b) => (setupSortDesc ? b.pnl - a.pnl : a.pnl - b.pnl));

  const weekDays = [
    { label: 'Monday', val: 1 },
    { label: 'Tuesday', val: 2 },
    { label: 'Wednesday', val: 3 },
    { label: 'Thursday', val: 4 },
    { label: 'Friday', val: 5 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. FILTER CONTROLS PANEL */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-300">
            <Filter size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold">Intelligence Filter Engine</span>
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
            id="btn-reset-filters"
          >
            <RotateCcw size={12} />
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-850/40">
          {/* Date from */}
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700"
              id="filter-start-date"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-700"
              id="filter-end-date"
            />
          </div>

          {/* Days of week checkbox group */}
          <div>
            <label className="block text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-2">Days of the Week</label>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map((d) => {
                const isActive = selectedDays.includes(d.val);
                return (
                  <button
                    key={d.val}
                    type="button"
                    onClick={() => toggleDay(d.val)}
                    className={`rounded px-2.5 py-1 text-[10px] font-mono font-medium transition-all ${
                      isActive
                        ? 'bg-emerald-950/50 border border-emerald-900 text-emerald-400'
                        : 'bg-zinc-950/40 border border-zinc-900 text-zinc-500 hover:text-zinc-300'
                    }`}
                    id={`filter-day-${d.val}`}
                  >
                    {d.label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SESSIONS GRID ANALYSIS */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
          Session Profitability Metrics
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Asian Session */}
          <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all bg-zinc-900/40 ${
            asianStats.pnl >= 0 ? 'border-emerald-900/40' : 'border-rose-900/40'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">Asian (Tokyo)</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  asianStats.pnl >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {asianStats.total} Trades
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {asianStats.winRate}% <span className="text-xs text-zinc-500 font-normal">Win Rate</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-850/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">Session P&L</span>
              <span className={`text-sm font-bold font-mono ${asianStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {asianStats.pnl >= 0 ? '+' : ''}${asianStats.pnl.toFixed(2)}
              </span>
            </div>
          </div>

          {/* London Session */}
          <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all bg-zinc-900/40 ${
            londonStats.pnl >= 0 ? 'border-emerald-900/40' : 'border-rose-900/40'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">London Session</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  londonStats.pnl >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {londonStats.total} Trades
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {londonStats.winRate}% <span className="text-xs text-zinc-500 font-normal">Win Rate</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-850/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">Session P&L</span>
              <span className={`text-sm font-bold font-mono ${londonStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {londonStats.pnl >= 0 ? '+' : ''}${londonStats.pnl.toFixed(2)}
              </span>
            </div>
          </div>

          {/* New York Session */}
          <div className={`border rounded-xl p-4 flex flex-col justify-between transition-all bg-zinc-900/40 ${
            nyStats.pnl >= 0 ? 'border-emerald-900/40' : 'border-rose-900/40'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wide">New York Session</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  nyStats.pnl >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {nyStats.total} Trades
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-white">
                {nyStats.winRate}% <span className="text-xs text-zinc-500 font-normal">Win Rate</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-850/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">Session P&L</span>
              <span className={`text-sm font-bold font-mono ${nyStats.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {nyStats.pnl >= 0 ? '+' : ''}${nyStats.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pair Performance Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Pair Effectiveness
            </h3>
            <button
              onClick={() => setPairSortDesc(!pairSortDesc)}
              className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
              id="btn-sort-pair-pnl"
            >
              <ArrowUpDown size={12} />
              Sort: {pairSortDesc ? 'Best first' : 'Worst first'}
            </button>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl overflow-hidden">
            {pairPerformances.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500">
                No trades recorded.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-950/20 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    <th className="p-3">Trading Pair</th>
                    <th className="p-3">Trades</th>
                    <th className="p-3">Win %</th>
                    <th className="p-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {pairPerformances.map((p) => (
                    <tr key={p.pair} className="hover:bg-zinc-900/20">
                      <td className="p-3 text-white uppercase font-bold">{p.pair}</td>
                      <td className="p-3 text-zinc-400 font-mono">{p.total}</td>
                      <td className="p-3 text-zinc-400 font-mono">{p.winRate}%</td>
                      <td className={`p-3 text-right font-bold font-mono ${p.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Setup Performance Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-500">
              Setup Strategy Effectiveness
            </h3>
            <button
              onClick={() => setSetupSortDesc(!setupSortDesc)}
              className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 hover:text-zinc-300"
              id="btn-sort-setup-pnl"
            >
              <ArrowUpDown size={12} />
              Sort: {setupSortDesc ? 'Best first' : 'Worst first'}
            </button>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl overflow-hidden">
            {setupPerformances.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500">
                No trades recorded.
              </div>
            ) : (
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-850 bg-zinc-950/20 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    <th className="p-3">Setup type</th>
                    <th className="p-3">Trades</th>
                    <th className="p-3">Win %</th>
                    <th className="p-3 text-right">Net P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {setupPerformances.map((s) => (
                    <tr key={s.setup} className="hover:bg-zinc-900/20">
                      <td className="p-3 text-white font-medium">{s.setup}</td>
                      <td className="p-3 text-zinc-400 font-mono">{s.total}</td>
                      <td className="p-3 text-zinc-400 font-mono">{s.winRate}%</td>
                      <td className={`p-3 text-right font-bold font-mono ${s.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
