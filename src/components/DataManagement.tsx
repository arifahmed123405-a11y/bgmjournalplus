import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Trade } from '../types';
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';

interface DataManagementProps {
  userId: string | undefined;
  accounts: Account[];
  trades: Trade[];
  onRefreshData: () => Promise<void>;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DataManagement({
  userId,
  accounts,
  trades,
  onRefreshData,
  onAddToast,
}: DataManagementProps) {
  const [importing, setImporting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      const dataStr = JSON.stringify({ accounts, trades }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `bgmarif_journal_backup_${new Date().toISOString().slice(0, 10)}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      onAddToast('Backup downloaded successfully', 'success');
    } catch (err) {
      console.error(err);
      onAddToast('Failed to export backup', 'error');
    }
  };

  const processBackupFile = async (file: File) => {
    if (!userId) {
      setError('Please sign in or use standard mode to import database items.');
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.accounts || !parsed.trades || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.trades)) {
        throw new Error('Invalid backup file structure. Missing "accounts" or "trades" arrays.');
      }

      onAddToast('Uploading backup data to Cloud...', 'info');

      // 1. Sync Accounts
      const accountIdMapping: Record<string, string> = {};

      for (const oldAcc of parsed.accounts) {
        // Create clean account item (letting Supabase generate new UUID if needed, or matching)
        const { data: newAcc, error: accError } = await supabase
          .from('accounts')
          .insert({
            user_id: userId,
            name: oldAcc.name || 'Imported Account',
            instrument: oldAcc.instrument || 'EURUSD',
            starting_balance: Number(oldAcc.starting_balance) || 0,
          })
          .select()
          .single();

        if (accError) throw accError;
        if (newAcc) {
          accountIdMapping[oldAcc.id] = newAcc.id;
        }
      }

      // 2. Sync Trades
      const tradesToInsert = parsed.trades.map((oldTrade: any) => {
        // Map to the new account UUID
        const newAccountId = accountIdMapping[oldTrade.account_id];
        if (!newAccountId) return null;

        return {
          user_id: userId,
          account_id: newAccountId,
          trade_date: oldTrade.trade_date || new Date().toISOString().slice(0, 10),
          pair: oldTrade.pair || 'EURUSD',
          gain_loss: Number(oldTrade.gain_loss) || 0,
          setup_type: oldTrade.setup_type || 'Other',
          session: oldTrade.session || 'London',
          rr_ratio: oldTrade.rr_ratio || '1:1',
          entry_reason: oldTrade.entry_reason || '',
          before_thought: oldTrade.before_thought || '',
          after_thought: oldTrade.after_thought || '',
          images: Array.isArray(oldTrade.images) ? oldTrade.images : [],
        };
      }).filter(Boolean);

      if (tradesToInsert.length > 0) {
        const { error: tradesError } = await supabase
          .from('trades')
          .insert(tradesToInsert);

        if (tradesError) throw tradesError;
      }

      onAddToast(`Imported ${parsed.accounts.length} accounts and ${tradesToInsert.length} trades successfully!`, 'success');
      await onRefreshData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error parsing or uploading backup file.');
      onAddToast('Backup restoration failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processBackupFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Introduction Header */}
      <div>
        <h2 className="text-xl font-sans font-bold text-white mb-1">
          Cloud Synchronisation & Backups
        </h2>
        <p className="text-xs text-zinc-400">
          Your trading log automatically syncs securely with the cloud. Use backups to export or restore accounts and trades.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center justify-center p-3 rounded-lg bg-emerald-500/10 text-emerald-400 mb-4">
              <Download size={22} />
            </div>
            <h3 className="text-md font-medium text-white mb-2">Export Local/Cloud Backup</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Download your complete ledger including all account names, instruments, starting balances, and full trade metrics as a JSON schema. Perfect for offline cold archives.
            </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-zinc-950 font-medium py-2.5 rounded-lg text-sm transition-all"
            id="btn-export-backup"
          >
            <Download size={16} />
            Download JSON Backup
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center justify-center p-3 rounded-lg bg-blue-500/10 text-blue-400 mb-4">
              <Upload size={22} />
            </div>
            <h3 className="text-md font-medium text-white mb-2">Restore Backup File</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Restore previously exported `.json` backups. Importing creates new entries and maps your historic trades to newly created accounts on the connected Cloud cluster.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
              id="import-file-selector"
            />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${
                dragging
                  ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/20'
              }`}
            >
              {importing ? (
                <div className="flex flex-col items-center gap-2 py-2">
                  <Loader2 className="animate-spin text-emerald-400" size={24} />
                  <span className="text-xs font-mono text-emerald-400">Restoring data cluster...</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-300 font-medium">
                    Drag backup file here, or <span className="text-emerald-400">browse files</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Only supports valid .json format
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 bg-rose-950/20 border border-rose-900/50 rounded-lg p-3 text-xs text-rose-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cloud Status Panel */}
      <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-xs font-medium text-white">Active Cloud Connection</div>
            <div className="text-[10px] font-mono text-zinc-500">
              Database: xajjsjvdnftccgekkmzo.supabase.co
            </div>
          </div>
        </div>

        <button
          onClick={async () => {
            onAddToast('Refreshing database stats...', 'info');
            await onRefreshData();
            onAddToast('Database synched!', 'success');
          }}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-white hover:border-zinc-700 transition-all"
          id="btn-cloud-sync-refresh"
        >
          <RefreshCw size={12} />
          Sync Live
        </button>
      </div>
    </div>
  );
}
