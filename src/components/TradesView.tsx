import React, { useState, useRef } from 'react';
import { Account, Trade, TRADING_PAIRS, SETUP_TYPES, TRADING_SESSIONS } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Table, Trash2, Calendar, FileText, Image as ImageIcon, X, Eye, Loader2, Sparkles, AlertCircle, Edit3, Star } from 'lucide-react';

interface TradesViewProps {
  account: Account | null;
  trades: Trade[];
  onRefreshData: () => Promise<void>;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPreviewImage: (src: string) => void;
  onOpenTradeDetails: (trade: Trade) => void;
}

export default function TradesView({
  account,
  trades,
  onRefreshData,
  onAddToast,
  onPreviewImage,
  onOpenTradeDetails,
}: TradesViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [tradeDate, setTradeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [pair, setPair] = useState<string>('EURUSD');
  const [gainLoss, setGainLoss] = useState<string>('');
  const [setupType, setSetupType] = useState<string>('Breakout');
  const [session, setSession] = useState<string>('London');
  const [rrRatio, setRrRatio] = useState<string>('1:2');
  const [entryReason, setEntryReason] = useState<string>('');
  const [beforeThought, setBeforeThought] = useState<string>('');
  const [afterThought, setAfterThought] = useState<string>('');
  const [images, setImages] = useState<string[]>([]); // holds Base64 strings
  const [rating, setRating] = useState<number>(5); // 1-5 star rating

  // Search/Filter states
  const [search, setSearch] = useState('');

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mb-4 animate-pulse">
          <Table size={24} />
        </div>
        <h3 className="text-md font-medium text-white mb-1">No Trading Account Selected</h3>
        <p className="text-xs text-zinc-500 max-w-xs">
          Please select or create a trading account from the top bar to log and analyze trades.
        </p>
      </div>
    );
  }

  // Filter trades for active account
  const accountTrades = trades.filter((t) => t.account_id === account.id);

  // Search filters
  const filteredTrades = accountTrades.filter((t) => {
    const term = search.toLowerCase();
    return (
      t.pair.toLowerCase().includes(term) ||
      t.setup_type.toLowerCase().includes(term) ||
      t.session.toLowerCase().includes(term) ||
      (t.entry_reason && t.entry_reason.toLowerCase().includes(term))
    );
  }).sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());

  // Handle image loading
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: any) => {
      // 1. Check size limit to prevent oversized Base64 (limit to 1.5MB per image for optimal DB sync)
      if (file.size > 1.5 * 1024 * 1024) {
        onAddToast(`Image "${file.name}" exceeds the 1.5MB standard compression limit.`, 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages((prev) => [...prev, base64String]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gainLoss || isNaN(Number(gainLoss))) {
      onAddToast('Please enter a valid numeric gain/loss amount.', 'error');
      return;
    }

    setSubmitting(true);
    const isDemoMode = localStorage.getItem('is_demo_mode') === 'true';

    try {
      if (isDemoMode) {
        const newTrade: Trade = {
          id: `demo-t-${Math.random().toString(36).substring(2)}`,
          user_id: 'demo-user',
          account_id: account.id,
          trade_date: tradeDate,
          pair: pair,
          gain_loss: Number(gainLoss),
          setup_type: setupType,
          session: session,
          rr_ratio: rrRatio,
          entry_reason: entryReason,
          before_thought: beforeThought,
          after_thought: afterThought,
          images: images,
          rating: rating,
          created_at: new Date().toISOString()
        };

        const storedTrades = localStorage.getItem('demo_trades');
        const localTrades = storedTrades ? JSON.parse(storedTrades) : [];
        const updatedTrades = [newTrade, ...localTrades];
        localStorage.setItem('demo_trades', JSON.stringify(updatedTrades));

        onAddToast('Trade logged successfully to sandbox ledger!', 'success');
      } else {
        const { data, error } = await supabase.from('trades').insert({
          user_id: account.user_id,
          account_id: account.id,
          trade_date: tradeDate,
          pair: pair,
          gain_loss: Number(gainLoss),
          setup_type: setupType,
          session: session,
          rr_ratio: rrRatio,
          entry_reason: entryReason,
          before_thought: beforeThought,
          after_thought: afterThought,
          images: images,
          rating: rating,
        });

        if (error) throw error;

        onAddToast('Trade logged successfully to cloud ledger!', 'success');
      }

      setShowAddForm(false);
      // Reset form states
      setGainLoss('');
      setEntryReason('');
      setBeforeThought('');
      setAfterThought('');
      setImages([]);
      setRating(5);
      setTradeDate(new Date().toISOString().slice(0, 10));

      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      onAddToast(err.message || 'Failed to submit trade.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this trade from your journal?')) return;

    const isDemoMode = localStorage.getItem('is_demo_mode') === 'true';

    try {
      if (isDemoMode) {
        const storedTrades = localStorage.getItem('demo_trades');
        const localTrades = storedTrades ? JSON.parse(storedTrades) : [];
        const updatedTrades = localTrades.filter((t: any) => t.id !== id);
        localStorage.setItem('demo_trades', JSON.stringify(updatedTrades));
        onAddToast('Trade permanently deleted from sandbox.', 'success');
      } else {
        const { error } = await supabase.from('trades').delete().eq('id', id);
        if (error) throw error;
        onAddToast('Trade permanently deleted.', 'success');
      }
      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      onAddToast(err.message || 'Error deleting trade.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-sans font-bold text-white mb-1">Trade Ledger</h2>
          <p className="text-xs text-slate-400">
            Current Account: <span className="text-white font-mono font-bold">{account.name}</span> • {accountTrades.length} logged records
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2.5 text-xs transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
          id="btn-toggle-add-trade-form"
        >
          {showAddForm ? <X size={14} /> : <Plus size={14} />}
          {showAddForm ? 'Cancel Form' : 'Log New Trade'}
        </button>
      </div>

      {/* Add Trade Form Drawer/Card */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-[#09090b] border border-white/5 rounded-2xl p-6 space-y-6 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-300" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Date Selection */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trade Date</label>
              <input
                type="date"
                required
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-trade-date"
              />
            </div>

            {/* Trading Pair Dropdown */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trading Pair</label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all uppercase"
                id="field-trading-pair"
              >
                {TRADING_PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Gain/Loss Entry */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex justify-between">
                <span>Gain / Loss ($)</span>
                <span className="text-[9px] text-slate-500 normal-case">Use negative for loss</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 150.25 or -50.00"
                value={gainLoss}
                onChange={(e) => setGainLoss(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-gain-loss"
              />
            </div>

            {/* Setup Type */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Setup Strategy</label>
              <select
                value={setupType}
                onChange={(e) => setSetupType(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-setup-type"
              >
                {SETUP_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Session dropdown */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trading Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-session"
              >
                {TRADING_SESSIONS.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>

            {/* R:R Ratio */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Risk:Reward Ratio</label>
              <input
                type="text"
                placeholder="e.g., 1:2 or 1:3"
                value={rrRatio}
                onChange={(e) => setRrRatio(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-rr-ratio"
              />
            </div>

            {/* Entry Reason */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Entry Reason (Optional)</label>
              <input
                type="text"
                placeholder="e.g., HTF Orderblock tap + LTF CHoCH"
                value={entryReason}
                onChange={(e) => setEntryReason(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-entry-reason"
              />
            </div>

            {/* Execution Rating */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Trade Execution Rating</label>
              <div className="flex items-center gap-1.5 bg-[#050507] border border-white/5 rounded-xl px-3 py-2 h-[38px] justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-0.5 hover:scale-110 transition-transform cursor-pointer"
                    title={`${star} Star${star > 1 ? 's' : ''}`}
                    id={`btn-form-star-${star}`}
                  >
                    <Star
                      size={15}
                      className={star <= rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-600 fill-none'}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Thoughts Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pre-Market thoughts</label>
              <textarea
                placeholder="What was the psychological state? Dynamic bias of the session?"
                rows={3}
                value={beforeThought}
                onChange={(e) => setBeforeThought(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-before-thoughts"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">Post-Market thoughts</label>
              <textarea
                placeholder="What did you learn? Did you stick to risk management principles?"
                rows={3}
                value={afterThought}
                onChange={(e) => setAfterThought(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 transition-all"
                id="field-after-thoughts"
              />
            </div>
          </div>

          {/* Image Upload Area */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Chart Screenshots (Optional)
            </label>

            <div className="flex flex-wrap gap-4 items-center">
              {/* Box triggers file upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="h-20 w-28 rounded-xl border-2 border-dashed border-white/5 hover:border-white/15 bg-[#050507]/40 flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-slate-500 hover:text-slate-300 shadow-inner"
              >
                <ImageIcon size={18} />
                <span className="text-[10px] font-mono font-bold">Upload Chart</span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                multiple
                className="hidden"
                id="form-image-uploader"
              />

              {/* Thumbnails of already selected files */}
              {images.map((imgSrc, idx) => (
                <div key={idx} className="relative h-20 w-28 group rounded-xl overflow-hidden border border-white/5">
                  <img
                    src={imgSrc}
                    alt="trade thumbnail"
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => onPreviewImage(imgSrc)}
                  />

                  {/* Remove hover button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-rose-900 text-white rounded-full p-1 hover:bg-rose-800 transition-colors cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                  <span className="absolute bottom-1 left-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-mono text-slate-300">
                    Preview
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-1.5">
              Compress screenshots to keep size within 1.5MB. You can upload multiple charts per entry.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2.5 rounded-xl bg-[#050507] border border-white/5 text-xs font-mono text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
              id="btn-cancel-trade-submit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
              id="btn-submit-trade"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  Saving trade...
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Commit to Cloud
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Trade Search & Ledger Table */}
      <div className="bg-[#09090b] border border-white/5 rounded-2xl overflow-hidden shadow-inner">
        {/* Search bar */}
        <div className="p-4 border-b border-white/5 bg-[#050507]/20 flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search trades by pair, setup type, entry reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm bg-[#050507] border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-white/10 focus:ring-1 focus:ring-emerald-500/10 placeholder-slate-600 transition-all"
            id="trade-search-input"
          />

          <span className="text-[10px] font-mono text-slate-500 shrink-0">
            Showing {filteredTrades.length} of {accountTrades.length} trades
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          {filteredTrades.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-slate-500">
              No trades matched the criteria or are logged yet.
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-mono text-slate-400 bg-[#050507]/40 uppercase tracking-widest font-bold">
                  <th className="p-4">Date</th>
                  <th className="p-4">Pair</th>
                  <th className="p-4">Setup</th>
                  <th className="p-4">Session</th>
                  <th className="p-4">R:R Ratio</th>
                  <th className="p-4">Images</th>
                  <th className="p-4">Rating</th>
                  <th className="p-4 text-right">Gain / Loss ($)</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTrades.map((trade) => {
                  const isWin = Number(trade.gain_loss) > 0;
                  const imgCount = Array.isArray(trade.images) ? trade.images.length : 0;

                  return (
                    <tr
                      key={trade.id}
                      className="text-xs hover:bg-white/[0.02] group transition-all"
                    >
                      <td className="p-4 text-slate-300 whitespace-nowrap font-mono">{trade.trade_date}</td>
                      <td className="p-4 text-white uppercase font-bold tracking-tight">{trade.pair}</td>
                      <td className="p-4">
                        <span className="rounded-lg bg-[#050507] border border-white/5 px-2.5 py-1 text-[10px] text-slate-300 font-mono font-bold">
                          {trade.setup_type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400 font-mono">{trade.session}</td>
                      <td className="p-4 text-slate-400 font-mono">{trade.rr_ratio || '1:1'}</td>
                      <td className="p-4">
                        {imgCount > 0 ? (
                          <span className="text-emerald-400 text-[11px] font-mono font-bold flex items-center gap-1">
                            <ImageIcon size={12} />
                            {imgCount} chart(s)
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const starRating = trade.rating || 5;
                            return (
                              <Star
                                key={star}
                                size={12}
                                className={star <= starRating ? 'fill-amber-400 stroke-amber-400' : 'stroke-zinc-800 fill-none'}
                              />
                            );
                          })}
                        </div>
                      </td>
                      <td className={`p-4 text-right font-bold font-mono ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${Number(trade.gain_loss).toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onOpenTradeDetails(trade)}
                            className="rounded-lg bg-[#050507] border border-white/5 hover:border-white/10 text-slate-300 hover:text-white px-3 py-1.5 text-[10px] font-mono transition-all cursor-pointer shadow-inner"
                            id={`btn-view-trade-details-${trade.id}`}
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                            id={`btn-delete-trade-${trade.id}`}
                            title="Delete permanently"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
