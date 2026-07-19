import React from 'react';
import { Trade } from '../types';
import { X, Calendar, DollarSign, Award, Target, MessageSquare, Image as ImageIcon, Star } from 'lucide-react';

interface TradeDetailsModalProps {
  trade: Trade;
  onClose: () => void;
  onPreviewImage: (src: string) => void;
}

export default function TradeDetailsModal({ trade, onClose, onPreviewImage }: TradeDetailsModalProps) {
  const isWin = Number(trade.gain_loss) > 0;
  const imageCount = Array.isArray(trade.images) ? trade.images.length : 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 px-4 select-none">
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-850 p-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-zinc-500">{trade.trade_date}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-sm font-bold text-white uppercase tracking-wider">{trade.pair} Entry details</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            id="btn-details-modal-close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Gain/Loss Banner */}
          <div className={`p-5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isWin ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-rose-950/20 border-rose-900/40'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Position Outcome</span>
                <div className={`text-2xl font-black font-mono leading-none mt-1 ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isWin ? '+' : ''}${Number(trade.gain_loss).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="sm:border-l sm:border-zinc-800 sm:pl-6">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Execution Rating</span>
                <div className="flex items-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const starRating = trade.rating || 5;
                    return (
                      <Star
                        key={star}
                        size={14}
                        className={star <= starRating ? 'fill-amber-400 stroke-amber-400' : 'stroke-zinc-600 fill-none'}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-6">
              <div className="text-center sm:text-right">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Session</span>
                <span className="text-xs text-white font-medium">{trade.session}</span>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">R:R Ratio</span>
                <span className="text-xs text-white font-mono">{trade.rr_ratio || '1:1'}</span>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Strategy</span>
                <span className="text-xs text-emerald-400 font-mono font-medium">{trade.setup_type}</span>
              </div>
            </div>
          </div>

          {/* Entry reason */}
          {trade.entry_reason && (
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Trigger Entry Reason</h4>
              <p className="text-xs text-zinc-200 bg-zinc-950/40 border border-zinc-850 p-3 rounded-lg leading-relaxed">
                {trade.entry_reason}
              </p>
            </div>
          )}

          {/* Thoughts Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pre-market */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Pre-Market Analysis</h4>
              <div className="text-xs text-zinc-300 bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-lg leading-relaxed h-[120px] overflow-y-auto">
                {trade.before_thought ? (
                  trade.before_thought
                ) : (
                  <span className="text-zinc-600 font-mono text-[10px]">No pre-market analysis thoughts recorded for this entry.</span>
                )}
              </div>
            </div>

            {/* Post-market */}
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Post-Market Reflection</h4>
              <div className="text-xs text-zinc-300 bg-zinc-950/40 border border-zinc-850 p-3.5 rounded-lg leading-relaxed h-[120px] overflow-y-auto">
                {trade.after_thought ? (
                  trade.after_thought
                ) : (
                  <span className="text-zinc-600 font-mono text-[10px]">No post-market reflection thoughts recorded for this entry.</span>
                )}
              </div>
            </div>
          </div>

          {/* Attachment Gallery */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={12} />
              Chart Attachments ({imageCount})
            </h4>

            {imageCount === 0 ? (
              <div className="text-[10px] font-mono text-zinc-600 p-4 border border-zinc-850 border-dashed rounded-lg text-center">
                No charts uploaded with this trade entry.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {trade.images.map((imgSrc, i) => (
                  <div
                    key={i}
                    onClick={() => onPreviewImage(imgSrc)}
                    className="relative h-24 w-36 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer group"
                  >
                    <img
                      src={imgSrc}
                      alt={`Chart attachment ${i + 1}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-[10px] font-mono text-white bg-zinc-950/80 px-2 py-1 rounded">
                        Zoom View
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Close footer */}
        <div className="border-t border-zinc-850 bg-zinc-950/30 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-300 hover:text-white transition-all font-mono"
            id="btn-details-modal-footer-close"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
