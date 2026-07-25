import React, { useState, useRef } from 'react';
import { Account, Trade, TRADING_PAIRS, SETUP_TYPES, TRADING_SESSIONS } from '../types';
import { supabase } from '../lib/supabase';
import { Plus, Table, Trash2, Calendar, FileText, Image as ImageIcon, X, Eye, Loader2, Sparkles, AlertCircle, Edit3, Star, TrendingUp, TrendingDown, ArrowLeft } from 'lucide-react';

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
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [tradeDate, setTradeDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [direction, setDirection] = useState<'BUY' | 'SELL'>('BUY');
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
      (t.direction && t.direction.toLowerCase().includes(term)) ||
      (t.entry_reason && t.entry_reason.toLowerCase().includes(term))
    );
  }).sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());

  const [compressingImages, setCompressingImages] = useState(false);

  // Helper to compress image file using offscreen canvas for fast DB sync
  const compressAndAddImage = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to load image element'));
        img.onload = () => {
          const maxDim = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve(compressedDataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setCompressingImages(true);
    const fileList = Array.from(files) as File[];

    try {
      const compressedList = await Promise.all(
        fileList.map((file) => compressAndAddImage(file))
      );
      setImages((prev) => [...prev, ...compressedList]);
      onAddToast(`Added ${compressedList.length} chart screenshot(s)`, 'success');
    } catch (err: any) {
      console.error(err);
      onAddToast('Failed to process image file.', 'error');
    } finally {
      setCompressingImages(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setGainLoss('');
    setEntryReason('');
    setBeforeThought('');
    setAfterThought('');
    setImages([]);
    setRating(5);
    setDirection('BUY');
    setTradeDate(new Date().toISOString().slice(0, 10));
    setEditingTrade(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!gainLoss || isNaN(Number(gainLoss))) {
      onAddToast('Please enter a valid numeric gain/loss amount.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      if (editingTrade) {
        const { error } = await supabase
          .from('trades')
          .update({
            trade_date: tradeDate,
            direction: direction,
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
          })
          .eq('id', editingTrade.id);

        if (error) throw error;
        onAddToast('Trade updated successfully in cloud ledger!', 'success');
      } else {
        const { error } = await supabase.from('trades').insert({
          user_id: account.user_id,
          account_id: account.id,
          trade_date: tradeDate,
          direction: direction,
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
      resetForm();

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

    try {
      const { error } = await supabase.from('trades').delete().eq('id', id);
      if (error) throw error;
      onAddToast('Trade permanently deleted.', 'success');
      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      onAddToast(err.message || 'Error deleting trade.', 'error');
    }
  };

  // IF FORM IS OPEN: Show dedicated full Add/Edit Form view ONLY
  if (showAddForm) {
    return (
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Form view header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
              id="btn-back-to-ledger"
            >
              <ArrowLeft size={14} />
              Back to Ledger
            </button>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Edit3 size={16} className="text-emerald-400" />
                {editingTrade ? 'Edit Trade Entry' : 'Log New Trade'}
              </h2>
              <p className="text-[11px] text-slate-400">
                Account: <span className="text-emerald-400 font-mono font-bold">{account.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Compact Form Card fitting all info cleanly on screen */}
        <form onSubmit={handleSubmit} className="bg-[#09090b] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-4 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />

          {/* ROW 1: Direction (BUY/SELL), Date, Pair, Gain/Loss */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* BUY / SELL Direction Selector */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Position Type
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#050507] border border-white/5 rounded-xl h-[38px] items-center">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`flex items-center justify-center gap-1 h-full rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    direction === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  id="btn-direction-buy"
                >
                  <TrendingUp size={13} />
                  BUY
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`flex items-center justify-center gap-1 h-full rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    direction === 'SELL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  id="btn-direction-sell"
                >
                  <TrendingDown size={13} />
                  SELL
                </button>
              </div>
            </div>

            {/* Trade Date */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Trade Date
              </label>
              <input
                type="date"
                required
                value={tradeDate}
                onChange={(e) => setTradeDate(e.target.value)}
                className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-all"
                id="field-trade-date"
              />
            </div>

            {/* Trading Pair */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Trading Pair
              </label>
              <select
                value={pair}
                onChange={(e) => setPair(e.target.value)}
                className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-all uppercase"
                id="field-trading-pair"
              >
                {TRADING_PAIRS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Gain/Loss Amount */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                <span>Gain / Loss ($)</span>
                <span className="text-[9px] text-slate-500 normal-case">- for loss</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 150.25 or -50.00"
                value={gainLoss}
                onChange={(e) => setGainLoss(e.target.value)}
                className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all"
                id="field-gain-loss"
              />
            </div>
          </div>

          {/* ROW 2: Setup, Session, RR, Rating */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Setup Strategy */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Setup Strategy
              </label>
              <select
                value={setupType}
                onChange={(e) => setSetupType(e.target.value)}
                className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-all"
                id="field-setup-type"
              >
                {SETUP_TYPES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Session */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Trading Session
              </label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-emerald-500/30 transition-all"
                id="field-session"
              >
                {TRADING_SESSIONS.map((ts) => (
                  <option key={ts} value={ts}>{ts}</option>
                ))}
              </select>
            </div>

            {/* Risk:Reward Ratio */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                R:R Ratio
              </label>
              <input
                type="text"
                placeholder="e.g., 1:2 or 1:3"
                value={rrRatio}
                onChange={(e) => setRrRatio(e.target.value)}
                className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all"
                id="field-rr-ratio"
              />
            </div>

            {/* Execution Rating */}
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Execution Rating
              </label>
              <div className="flex items-center gap-1 bg-[#050507] border border-white/5 rounded-xl px-3 h-[38px] justify-center">
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
                      size={14}
                      className={star <= rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-slate-600 fill-none'}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: Entry Reason */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              Entry Confirmation / Trigger (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., 15m Liquidity sweep + Bullish FVG entry"
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              className="w-full h-[38px] bg-[#050507] border border-white/5 rounded-xl px-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all"
              id="field-entry-reason"
            />
          </div>

          {/* ROW 4: Pre-Market & Post-Market thoughts (Side by side) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Pre-Market Mindset
              </label>
              <textarea
                placeholder="Mindset, plan, higher timeframe context..."
                rows={2}
                value={beforeThought}
                onChange={(e) => setBeforeThought(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all resize-none"
                id="field-before-thoughts"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                Post-Market Reflection
              </label>
              <textarea
                placeholder="Execution review, mistakes, key lessons..."
                rows={2}
                value={afterThought}
                onChange={(e) => setAfterThought(e.target.value)}
                className="w-full bg-[#050507] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-emerald-500/30 transition-all resize-none"
                id="field-after-thoughts"
              />
            </div>
          </div>

          {/* ROW 5: Chart Screenshots */}
          <div>
            <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
              Chart Screenshots
            </label>

            <div className="flex flex-wrap gap-2.5 items-center">
              {/* Box triggers file upload */}
              <div
                onClick={() => !compressingImages && fileInputRef.current?.click()}
                className={`h-16 w-24 rounded-xl border border-dashed border-white/10 hover:border-emerald-500/40 bg-[#050507] flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-slate-500 hover:text-slate-300 ${
                  compressingImages ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {compressingImages ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-emerald-400" />
                    <span className="text-[8px] font-mono text-emerald-400 font-bold">Scaling...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon size={16} />
                    <span className="text-[9px] font-mono font-bold">Add Chart</span>
                  </>
                )}
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

              {/* Thumbnails */}
              {images.map((imgSrc, idx) => (
                <div key={idx} className="relative h-16 w-24 group rounded-xl overflow-hidden border border-white/10 bg-black">
                  <img
                    src={imgSrc}
                    alt="trade thumbnail"
                    className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onPreviewImage(imgSrc)}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-rose-900/90 text-white rounded-full p-0.5 hover:bg-rose-800 transition-colors cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Action Controls */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                resetForm();
              }}
              className="px-4 py-2 rounded-xl bg-[#050507] border border-white/5 text-xs font-mono text-slate-400 hover:text-white hover:border-white/10 transition-all cursor-pointer"
              id="btn-cancel-trade-submit"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
              id="btn-submit-trade"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  {editingTrade ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                <>
                  {editingTrade ? <Edit3 size={14} /> : <Plus size={14} />}
                  {editingTrade ? 'Update Entry' : 'Save Trade to Journal'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // IF FORM IS CLOSED: Show Trade Ledger List View
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
          onClick={() => {
            resetForm();
            setShowAddForm(true);
          }}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2.5 text-xs transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98] cursor-pointer"
          id="btn-toggle-add-trade-form"
        >
          <Plus size={14} />
          Log New Trade
        </button>
      </div>

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
                  <th className="p-4">Type</th>
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
                  const isBuy = (trade.direction || 'BUY') === 'BUY';

                  return (
                    <tr
                      key={trade.id}
                      className="text-xs hover:bg-white/[0.02] group transition-all"
                    >
                      <td className="p-4 text-slate-300 whitespace-nowrap font-mono">{trade.trade_date}</td>
                      <td className="p-4">
                        {isBuy ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 text-[10px] font-mono font-bold">
                            <TrendingUp size={11} />
                            BUY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400 px-2 py-0.5 text-[10px] font-mono font-bold">
                            <TrendingDown size={11} />
                            SELL
                          </span>
                        )}
                      </td>
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onOpenTradeDetails(trade)}
                            className="rounded-lg bg-[#050507] border border-white/5 hover:border-white/10 text-slate-300 hover:text-white px-2 py-1 text-[10px] font-mono transition-all cursor-pointer shadow-inner flex items-center gap-1"
                            id={`btn-view-trade-details-${trade.id}`}
                            title="View trade details"
                          >
                            <Eye size={11} className="text-zinc-400" />
                            <span className="hidden sm:inline">View</span>
                          </button>
                          <button
                            onClick={() => {
                              setEditingTrade(trade);
                              setTradeDate(trade.trade_date);
                              setDirection(trade.direction || 'BUY');
                              setPair(trade.pair);
                              setGainLoss(String(trade.gain_loss));
                              setSetupType(trade.setup_type);
                              setSession(trade.session);
                              setRrRatio(trade.rr_ratio || '');
                              setEntryReason(trade.entry_reason || '');
                              setBeforeThought(trade.before_thought || '');
                              setAfterThought(trade.after_thought || '');
                              setImages(trade.images || []);
                              setRating(trade.rating || 5);
                              setShowAddForm(true);
                            }}
                            className="rounded-lg bg-[#050507] border border-white/5 hover:border-emerald-500/20 text-slate-300 hover:text-emerald-400 px-2 py-1 text-[10px] font-mono transition-all cursor-pointer shadow-inner flex items-center gap-1"
                            id={`btn-edit-trade-${trade.id}`}
                            title="Edit trade entry"
                          >
                            <Edit3 size={11} className="text-emerald-500" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="rounded-lg bg-[#050507] border border-white/5 hover:border-rose-500/20 text-slate-400 hover:text-rose-400 px-2 py-1 text-[10px] font-mono transition-all cursor-pointer shadow-inner flex items-center gap-1"
                            id={`btn-delete-trade-${trade.id}`}
                            title="Delete permanently"
                          >
                            <Trash2 size={11} className="text-rose-500" />
                            <span className="hidden sm:inline">Delete</span>
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
