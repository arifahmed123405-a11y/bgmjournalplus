import React, { useState } from 'react';
import { Account, Trade } from '../types';
import EquityChart from './EquityChart';
import { TrendingUp, Award, Calendar, DollarSign, Target, Sparkles, HelpCircle, Layers, Info } from 'lucide-react';

interface DashboardProps {
  account: Account | null;
  trades: Trade[];
}

export default function Dashboard({ account, trades }: DashboardProps) {
  const [breakdownTab, setBreakdownTab] = useState<'pairs' | 'setups' | 'combos'>('pairs');
  const [showConsistencyInfo, setShowConsistencyInfo] = useState(false);

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
          <DollarSign size={24} />
        </div>
        <h3 className="text-md font-medium text-white mb-1">No Trading Account Selected</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Please select or create a trading account from the top bar to initialize your dashboard metrics.
        </p>
      </div>
    );
  }

  // Filter trades for the selected account
  const accountTrades = trades.filter((t) => t.account_id === account.id);

  // 1. Calculations
  const startingBalance = Number(account.starting_balance) || 0;
  const netPnL = accountTrades.reduce((sum, t) => sum + Number(t.gain_loss), 0);
  const currentBalance = startingBalance + netPnL;

  const totalTrades = accountTrades.length;
  const winningTrades = accountTrades.filter((t) => Number(t.gain_loss) > 0);
  const winRate = totalTrades > 0 ? Math.round((winningTrades.length / totalTrades) * 100) : 0;

  // 2. Best Pair
  const pairStats: Record<string, number> = {};
  accountTrades.forEach((t) => {
    pairStats[t.pair] = (pairStats[t.pair] || 0) + Number(t.gain_loss);
  });
  let bestPair = 'None';
  let bestPairGain = -Infinity;
  Object.entries(pairStats).forEach(([pair, gain]) => {
    if (gain > bestPairGain && gain > 0) {
      bestPairGain = gain;
      bestPair = pair;
    }
  });

  // 3. Current Streak (e.g. 5W, 3L)
  // Sort trades chronologically to calculate the active streak
  const chronologicalTrades = [...accountTrades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  let currentStreak = '0W';
  if (chronologicalTrades.length > 0) {
    const lastTrade = chronologicalTrades[chronologicalTrades.length - 1];
    const isLastWin = Number(lastTrade.gain_loss) >= 0;
    let count = 0;

    for (let i = chronologicalTrades.length - 1; i >= 0; i--) {
      const isWin = Number(chronologicalTrades[i].gain_loss) >= 0;
      if (isWin === isLastWin) {
        count++;
      } else {
        break;
      }
    }
    currentStreak = `${count}${isLastWin ? 'W' : 'L'}`;
  }

  // 4. Consistency Score (0-100%)
  // Prop Firm concentration metric: Calculates daily aggregated profit.
  // Consistency = 100 - (Max Profit of a single calendar day / Total Positive Daily Profit) * 100
  const dailyPnLs: Record<string, number> = {};
  accountTrades.forEach((t) => {
    dailyPnLs[t.trade_date] = (dailyPnLs[t.trade_date] || 0) + Number(t.gain_loss);
  });

  const dailyProfits = Object.values(dailyPnLs).filter((val) => val > 0);
  const totalPositiveProfit = dailyProfits.reduce((sum, val) => sum + val, 0);
  const maxSingleDayProfit = dailyProfits.length > 0 ? Math.max(...dailyProfits) : 0;

  let consistencyScore = 0;
  if (totalTrades === 0) {
    consistencyScore = 100; // Fresh account is fully consistent
  } else if (totalPositiveProfit > 0) {
    // If they have multiple positive days, concentration goes down and score climbs.
    const concentration = maxSingleDayProfit / totalPositiveProfit;
    consistencyScore = Math.max(0, Math.min(100, Math.round((1 - concentration) * 100)));
    // If they only have 1 trade/day, give a baseline consistency based on general distribution
    if (dailyProfits.length === 1) {
      consistencyScore = 25; // baseline for single lucky day
    }
  } else {
    // If all trades are losses/breakeven, measure consistency of risk size
    const losses = accountTrades.map((t) => Math.abs(Number(t.gain_loss))).filter(val => val > 0);
    if (losses.length > 1) {
      const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
      const maxLoss = Math.max(...losses);
      consistencyScore = Math.max(10, Math.min(100, Math.round((avgLoss / maxLoss) * 100)));
    } else {
      consistencyScore = 50;
    }
  }

  // 5. Top Performing Pairs Breakdown
  const pairDetailsMap: Record<string, { trades: number; wins: number; pnl: number }> = {};
  accountTrades.forEach((t) => {
    if (!pairDetailsMap[t.pair]) {
      pairDetailsMap[t.pair] = { trades: 0, wins: 0, pnl: 0 };
    }
    const stat = pairDetailsMap[t.pair];
    stat.trades++;
    if (Number(t.gain_loss) > 0) {
      stat.wins++;
    }
    stat.pnl += Number(t.gain_loss);
  });

  const topPairs = Object.entries(pairDetailsMap)
    .map(([pair, stats]) => ({
      pair,
      trades: stats.trades,
      winRate: stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100) : 0,
      pnl: stats.pnl,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  // 6. Top Setup Strategies Breakdown
  const setupDetailsMap: Record<string, { trades: number; wins: number; pnl: number }> = {};
  accountTrades.forEach((t) => {
    const sType = t.setup_type || 'Other';
    if (!setupDetailsMap[sType]) {
      setupDetailsMap[sType] = { trades: 0, wins: 0, pnl: 0 };
    }
    const stat = setupDetailsMap[sType];
    stat.trades++;
    if (Number(t.gain_loss) > 0) {
      stat.wins++;
    }
    stat.pnl += Number(t.gain_loss);
  });

  const topSetups = Object.entries(setupDetailsMap)
    .map(([setup, stats]) => ({
      setup,
      trades: stats.trades,
      winRate: stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100) : 0,
      pnl: stats.pnl,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  // Determine Best setup
  let bestSetup = 'None';
  let bestSetupGain = -Infinity;
  topSetups.forEach((s) => {
    if (s.pnl > bestSetupGain && s.pnl > 0) {
      bestSetupGain = s.pnl;
      bestSetup = s.setup;
    }
  });

  // 7. Setup + Pair Combinations Breakdown (Best Trades)
  const comboDetailsMap: Record<string, { trades: number; wins: number; pnl: number; pair: string; setup: string }> = {};
  accountTrades.forEach((t) => {
    const sType = t.setup_type || 'Other';
    const pair = t.pair;
    const key = `${sType} on ${pair}`;
    if (!comboDetailsMap[key]) {
      comboDetailsMap[key] = { trades: 0, wins: 0, pnl: 0, pair, setup: sType };
    }
    const stat = comboDetailsMap[key];
    stat.trades++;
    if (Number(t.gain_loss) > 0) {
      stat.wins++;
    }
    stat.pnl += Number(t.gain_loss);
  });

  const topCombos = Object.entries(comboDetailsMap)
    .map(([key, stats]) => ({
      key,
      pair: stats.pair,
      setup: stats.setup,
      trades: stats.trades,
      winRate: stats.trades > 0 ? Math.round((stats.wins / stats.trades) * 100) : 0,
      pnl: stats.pnl,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 5);

  // Determine Best combo
  let bestCombo = 'None';
  let bestComboGain = -Infinity;
  topCombos.forEach((c) => {
    if (c.pnl > bestComboGain && c.pnl > 0) {
      bestComboGain = c.pnl;
      bestCombo = c.key;
    }
  });

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Account Balance */}
        <div className="bg-[#09090b] border border-white/5 rounded-xl p-4.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest">Account Balance</span>
            <DollarSign size={16} className="text-slate-500" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-white">
              ${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Start: ${startingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Net P&L */}
        <div className="bg-[#09090b] border border-white/5 rounded-xl p-4.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest">Net P&L</span>
            <TrendingUp size={16} className={netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
          </div>
          <div>
            <div className={`text-xl font-bold font-mono tracking-tight ${netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {netPnL >= 0 ? '+' : ''}${netPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Across {totalTrades} logged trades
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#09090b] border border-white/5 rounded-xl p-4.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest">Win Rate</span>
            <Target size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
              <span>{winRate}%</span>
              <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden max-w-[50px] hidden sm:block">
                <div className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${winRate}%` }}></div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {winningTrades.length} W / {totalTrades - winningTrades.length} L
            </div>
          </div>
        </div>

        {/* Consistency Score */}
        <div className="bg-[#09090b] border border-emerald-500/20 rounded-xl p-4.5 flex flex-col justify-between relative group shadow-inner">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span 
              onClick={() => setShowConsistencyInfo(!showConsistencyInfo)}
              className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest flex items-center gap-1 cursor-pointer select-none"
            >
              Consistency
              <HelpCircle size={12} className="text-slate-600 hover:text-emerald-400 transition-colors" />
            </span>
            <Award size={16} className="text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-bold font-mono tracking-tight text-emerald-400 flex items-center justify-between">
              <span>{consistencyScore}%</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded text-[9px] font-bold border border-emerald-500/20">
                {consistencyScore >= 70 ? 'OPTIMAL' : consistencyScore >= 50 ? 'STABLE' : 'FRAGILE'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Prop firm style scoring
            </div>
          </div>

          {/* Explaining tooltip (shows on hover or when clicked/held) */}
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-[#050507] border border-zinc-800 rounded-lg p-3.5 text-[10px] text-slate-400 font-mono z-30 leading-normal shadow-2xl transition-all duration-200 ${showConsistencyInfo ? 'block' : 'hidden group-hover:block'}`}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1.5">
              <p className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">Prop Firm Consistency Rule</p>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConsistencyInfo(false);
                }}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="mb-2 text-slate-300">
              Measures your daily profit concentration to ensure sustainable scaling.
            </p>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li><strong className="text-white">100% Score:</strong> No trades logged.</li>
              <li><strong className="text-white">25% Score:</strong> Single day baseline.</li>
              <li><strong className="text-white">Formula:</strong> 100 - (Max Profit of single day / Total Positive profit) * 100</li>
              <li><strong className="text-emerald-400 font-bold">Closed Trades Only:</strong> Calculated strictly based on fully closed/committed records.</li>
            </ul>
          </div>
        </div>

        {/* Current Streak */}
        <div className={`p-4.5 rounded-xl flex flex-col justify-between shadow-[0_10px_30px_rgba(79,70,229,0.15)] ${
          currentStreak.endsWith('W') && currentStreak !== '0W'
            ? 'bg-gradient-to-br from-indigo-950/40 to-indigo-900/40 border border-indigo-500/30'
            : 'bg-[#09090b] border border-white/5'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-widest">Active Streak</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
              currentStreak.endsWith('W') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              STREAK
            </span>
          </div>
          <div>
            <div className={`text-xl font-bold font-mono tracking-tight ${
              currentStreak.endsWith('W') && currentStreak !== '0W' ? 'text-indigo-400' : currentStreak === '0W' ? 'text-slate-400' : 'text-rose-400'
            }`}>
              {currentStreak}
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Consecutive wins or losses
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve & Combined Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Equity Performance Curve</h3>
            <span className="text-xs font-mono text-slate-500">Starting Balance: ${startingBalance}</span>
          </div>
          <div className="bg-[#09090b] border border-white/5 rounded-2xl p-6 shadow-inner">
            <EquityChart startingBalance={startingBalance} trades={accountTrades} />
          </div>
        </div>

        {/* Combined Pairs / Setup Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Analytics Breakdown</h3>
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1.5 truncate max-w-[200px]" title={breakdownTab === 'pairs' ? bestPair : breakdownTab === 'setups' ? bestSetup : bestCombo}>
              Best: <span className="text-emerald-400 font-bold uppercase truncate">{breakdownTab === 'pairs' ? bestPair : breakdownTab === 'setups' ? bestSetup : bestCombo}</span>
            </span>
          </div>

          <div className="bg-[#09090b] border border-white/5 rounded-2xl p-5 h-[340px] flex flex-col shadow-inner relative overflow-hidden">
            {/* Tab switchers */}
            <div className="flex gap-1 p-1 bg-[#050507] border border-white/5 rounded-xl mb-4 z-10 relative">
              <button
                onClick={() => setBreakdownTab('pairs')}
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  breakdownTab === 'pairs' ? 'bg-white/5 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pairs
              </button>
              <button
                onClick={() => setBreakdownTab('setups')}
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  breakdownTab === 'setups' ? 'bg-white/5 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Setups
              </button>
              <button
                onClick={() => setBreakdownTab('combos')}
                className={`flex-1 py-1.5 text-[10px] sm:text-xs font-mono rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  breakdownTab === 'combos' ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10' : 'text-slate-400 hover:text-white'
                }`}
              >
                Setup + Pairs
              </button>
            </div>

            <div className="flex-1 overflow-y-auto z-10 relative pr-1">
              {breakdownTab === 'pairs' ? (
                topPairs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 font-mono text-xs">
                    No pair trades logged.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {topPairs.map((tp, i) => (
                      <div
                        key={tp.pair}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#050507]/60 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-slate-500">{i + 1}.</span>
                            <span className="text-sm font-bold text-white uppercase tracking-tight">{tp.pair}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {tp.trades} Trades • Win Rate: {tp.winRate}%
                          </div>
                        </div>

                        <div className={`text-sm font-semibold font-mono ${tp.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tp.pnl >= 0 ? '+' : ''}${tp.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : breakdownTab === 'setups' ? (
                topSetups.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 font-mono text-xs">
                    No setups logged.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {topSetups.map((ts, i) => (
                      <div
                        key={ts.setup}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#050507]/60 border border-white/5 hover:border-white/10 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-slate-500">{i + 1}.</span>
                            <span className="text-sm font-bold text-white tracking-tight">{ts.setup}</span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {ts.trades} Trades • Win Rate: {ts.winRate}%
                          </div>
                        </div>

                        <div className={`text-sm font-semibold font-mono ${ts.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {ts.pnl >= 0 ? '+' : ''}${ts.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                topCombos.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-500 font-mono text-xs">
                    No combo trades logged.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {topCombos.map((tc, i) => (
                      <div
                        key={tc.key}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#050507]/60 border border-[#10b981]/10 hover:border-[#10b981]/25 transition-colors"
                      >
                        <div className="max-w-[70%]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-emerald-500/70">{i + 1}.</span>
                            <span className="text-xs font-bold text-white truncate" title={tc.key}>
                              {tc.setup} <span className="text-[10px] font-mono text-slate-400 font-normal">on</span> <span className="text-emerald-400 uppercase">{tc.pair}</span>
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {tc.trades} Trades • Win Rate: {tc.winRate}%
                          </div>
                        </div>

                        <div className={`text-sm font-semibold font-mono ${tc.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {tc.pnl >= 0 ? '+' : ''}${tc.pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
