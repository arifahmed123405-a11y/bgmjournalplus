import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Account, Trade, FilterState } from './types';

// Component imports
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import TradesView from './components/TradesView';
import AnalysisView from './components/AnalysisView';
import DataManagement from './components/DataManagement';
import ImageViewer from './components/ImageViewer';
import TradeDetailsModal from './components/TradeDetailsModal';

// Icons
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  TableProperties,
  BarChart2,
  Database,
  ChevronDown,
  Plus,
  LogOut,
  X,
  CreditCard,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Edit3
} from 'lucide-react';

interface Toast {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Core App states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  // UI States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'calendar' | 'trades' | 'analysis' | 'data'>('dashboard');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showEditAccountModal, setShowEditAccountModal] = useState(false);
  const [editAccName, setEditAccName] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Detail/Preview overlays
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);

  // New Account Form state
  const [newAccName, setNewAccName] = useState('');
  const [newAccInstrument, setNewAccInstrument] = useState('EURUSD');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  // Toast Management
  const addToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // 1. Initial Auth Check on Mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch or load seed data when session changes
  const refreshData = async () => {
    if (session?.user) {
      // Supabase Mode
      try {
        const { data: accs, error: accError } = await supabase
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: true });

        if (accError) throw accError;

        let activeAccs = accs || [];

        // Auto provision a default account if totally empty
        if (activeAccs.length === 0) {
          const { data: defaultAcc, error: createAccError } = await supabase
            .from('accounts')
            .insert({
              user_id: session.user.id,
              name: 'Forex Starter Account',
              instrument: 'EURUSD',
              starting_balance: 10000,
            })
            .select()
            .single();

          if (createAccError) throw createAccError;
          if (defaultAcc) {
            activeAccs = [defaultAcc];
          }
        }

        setAccounts(activeAccs);

        // Fetch Trades
        const { data: trs, error: trError } = await supabase
          .from('trades')
          .select('*')
          .order('trade_date', { ascending: false });

        if (trError) throw trError;

        setTrades(trs || []);

        // Pick selected account
        if (activeAccs.length > 0) {
          const activeId = localStorage.getItem('active_account_id');
          if (activeId && activeAccs.some(a => a.id === activeId)) {
            setSelectedAccountId(activeId);
          } else {
            setSelectedAccountId(activeAccs[0].id);
          }
        }
      } catch (err: any) {
        console.error(err);
        addToast(err.message || 'Failed to sync data from cloud.', 'error');
      }
    }
  };

  useEffect(() => {
    if (!loading) {
      refreshData();
    }
  }, [session, loading]);

  // Handle account switcher
  const handleSelectAccount = (id: string) => {
    setSelectedAccountId(id);
    localStorage.setItem('active_account_id', id);
    addToast(`Switched account context`, 'info');
  };

  // Add a new Trading Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || isNaN(Number(newAccBalance))) {
      addToast('Please input a valid account name and starting balance.', 'error');
      return;
    }

    setSavingAccount(true);
    const balanceNum = Number(newAccBalance);

    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: session.user.id,
          name: newAccName,
          instrument: newAccInstrument,
          starting_balance: balanceNum,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setAccounts((prev) => [...prev, data]);
        setSelectedAccountId(data.id);
        localStorage.setItem('active_account_id', data.id);
        addToast('Created cloud trading account!', 'success');
        setShowAddAccountModal(false);
      }

      // Reset fields
      setNewAccName('');
      setNewAccBalance('');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to create account.', 'error');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleRenameAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeAcc = accounts.find((a) => a.id === selectedAccountId);
    if (!editAccName.trim() || !activeAcc) {
      addToast('Please input a valid account name.', 'error');
      return;
    }

    const nameToSave = editAccName.trim();
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ name: nameToSave })
        .eq('id', activeAcc.id);

      if (error) throw error;

      setAccounts((prev) =>
        prev.map((acc) => (acc.id === activeAcc.id ? { ...acc, name: nameToSave } : acc))
      );
      addToast('Renamed cloud trading account!', 'success');
      setShowEditAccountModal(false);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to rename account.', 'error');
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      addToast(error.message, 'error');
    } else {
      setSession(null);
      addToast('Signed out of cloud cluster safely.', 'success');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-emerald-400 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.4)]" size={32} />
        <span className="text-xs font-mono text-zinc-500 tracking-wider">Loading BGM Trading system core...</span>
      </div>
    );
  }

  // If not authenticated, show Auth
  if (!session) {
    return (
      <Auth
        onAuthSuccess={(sess) => {
          setSession(sess);
          addToast('Successfully authenticated with Supabase!', 'success');
        }}
      />
    );
  }

  // Fetch active account object
  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || null;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#050507] text-slate-200 flex flex-col font-sans select-none pb-12">
      {/* 1. TOP HEADER NAVIGATION RAIL */}
      <header className="border-b border-white/5 bg-[#050507]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)]">
              B
            </div>
            <div>
              <div className="font-bold tracking-tight text-white text-sm flex items-center gap-1.5 leading-none">
                bgmarif <span className="text-emerald-500 font-normal">Trading Journal</span>
              </div>
            </div>
          </div>

          {/* Sync badge and Account Selector & Control Hub */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Syncing to Cloud</span>
            </div>

            {/* Switch Account Selector */}
            {accounts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="relative">
                  <div
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center gap-1.5 bg-[#09090b] border border-white/5 rounded-lg px-3 py-1.5 cursor-pointer hover:border-white/10 transition-all shadow-inner select-none"
                    id="btn-trigger-account-dropdown"
                  >
                    <CreditCard size={14} className="text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-200 uppercase truncate max-w-[120px] sm:max-w-[180px]">
                      {activeAccount?.name || 'Select Account'}
                    </span>
                    <ChevronDown size={14} className="text-zinc-500" />
                  </div>

                  {/* Dropdown Items list */}
                  {showAccountDropdown && (
                    <>
                      {/* Backdrop to close on click outside */}
                      <div className="fixed inset-0 z-40" onClick={() => setShowAccountDropdown(false)} />
                      <div className="absolute top-full right-0 mt-1.5 w-60 bg-[#09090b] border border-white/5 rounded-lg shadow-2xl z-50">
                        <div className="p-2 border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                          My Trading Accounts ({accounts.length})
                        </div>
                        <div className="max-h-48 overflow-y-auto p-1.5 space-y-1">
                          {accounts.map((acc) => (
                            <button
                              key={acc.id}
                              onClick={() => {
                                handleSelectAccount(acc.id);
                                setShowAccountDropdown(false);
                              }}
                              className={`w-full text-left rounded p-2 text-xs transition-colors flex items-center justify-between ${
                                acc.id === selectedAccountId
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                  : 'hover:bg-white/5 text-zinc-300'
                              }`}
                            >
                              <span className="truncate pr-2 font-medium">{acc.name}</span>
                              <span className="font-mono text-[10px] text-zinc-500 uppercase">
                                ({acc.instrument})
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="p-1.5 border-t border-white/5 bg-[#050507]/40">
                          <button
                            onClick={() => {
                              setShowAddAccountModal(true);
                              setShowAccountDropdown(false);
                            }}
                            className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 py-1.5 rounded transition-all font-medium"
                            id="btn-trigger-add-account"
                          >
                            <Plus size={12} />
                            Add Trading Account
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Edit Account Name Small Button */}
                {activeAccount && (
                  <button
                    onClick={() => {
                      setEditAccName(activeAccount.name);
                      setShowEditAccountModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-[#09090b] border border-white/5 hover:border-emerald-500/30 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Edit account name"
                    id="btn-edit-account-name"
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>
            )}

            {/* Quick Prominent Add Account Button */}
            <button
              onClick={() => setShowAddAccountModal(true)}
              className="p-2 rounded-lg bg-[#09090b] border border-emerald-500/10 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 font-mono text-[10px] font-bold"
              title="Add New Trading Account"
              id="btn-quick-add-account"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Account</span>
            </button>

            {/* Logout safe triggers */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg bg-[#09090b] border border-white/5 hover:border-white/10 text-zinc-400 hover:text-rose-400 transition-colors"
              title="Secure Logout"
              id="btn-logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN SUB-TABS INTERFACE */}
      <nav className="max-w-7xl mx-auto px-6 mt-6 w-full">
        <div className="flex border-b border-white/5 overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'calendar', label: 'Calendar Heatmap', icon: Calendar },
            { id: 'trades', label: 'Trade Ledger', icon: TableProperties },
            { id: 'analysis', label: 'Performance Analytics', icon: BarChart2 },
            { id: 'data', label: 'Sync & Data', icon: Database },
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg'
                }`}
                id={`tab-btn-${tab.id}`}
              >
                <IconComponent size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. TAB STAGES MOUNT */}
      <main className="max-w-7xl mx-auto px-4 mt-6 flex-1 w-full">
        {activeTab === 'dashboard' && (
          <Dashboard account={activeAccount} trades={trades} />
        )}

        {activeTab === 'calendar' && (
          <CalendarView
            account={activeAccount}
            trades={trades}
            onOpenTradeDetails={(t) => setViewingTrade(t)}
            onAddToast={addToast}
          />
        )}

        {activeTab === 'trades' && (
          <TradesView
            account={activeAccount}
            trades={trades}
            onRefreshData={refreshData}
            onAddToast={addToast}
            onPreviewImage={(src) => setPreviewImageSrc(src)}
            onOpenTradeDetails={(t) => setViewingTrade(t)}
          />
        )}

        {activeTab === 'analysis' && (
          <AnalysisView account={activeAccount} trades={trades} />
        )}

        {activeTab === 'data' && (
          <DataManagement
            userId={session?.user?.id}
            accounts={accounts}
            trades={trades}
            onRefreshData={refreshData}
            onAddToast={addToast}
          />
        )}
      </main>

      {/* 4. MODALS AND OVERLAYS */}

      {/* Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <span className="text-sm font-bold text-white uppercase font-mono">Create Trading Account</span>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                id="btn-add-account-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
              {/* Account name */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My $100K FTMO Phase 1"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full bg-zinc-950/85 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  id="field-new-account-name"
                />
              </div>

              {/* Instrument */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Primary Instrument</label>
                <select
                  value={newAccInstrument}
                  onChange={(e) => setNewAccInstrument(e.target.value)}
                  className="w-full bg-zinc-950/85 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                  id="field-new-account-instrument"
                >
                  <option value="EURUSD">EURUSD (Forex)</option>
                  <option value="Gold">Gold (XAUUSD)</option>
                  <option value="Silver">Silver (XAGUSD)</option>
                  <option value="NAS100">NAS100 (Nasdaq)</option>
                  <option value="US30">US30 (Dow Jones)</option>
                  <option value="SPX500">SPX500 (S&P 500)</option>
                  <option value="Oil">Oil (Crude)</option>
                  <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                </select>
              </div>

              {/* Starting balance */}
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">Starting Capital ($)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10000"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="w-full bg-zinc-950/85 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50"
                  id="field-new-account-balance"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-white"
                  id="btn-cancel-add-account"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAccount}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50"
                  id="btn-submit-new-account"
                >
                  {savingAccount ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      Provisioning...
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditAccountModal && activeAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-zinc-800 p-4">
              <span className="text-sm font-bold text-white uppercase font-mono">Edit Account Name</span>
              <button
                onClick={() => setShowEditAccountModal(false)}
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
                id="btn-edit-account-modal-close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRenameAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-400 uppercase tracking-wider mb-1.5">New Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My $100K FTMO"
                  value={editAccName}
                  onChange={(e) => setEditAccName(e.target.value)}
                  className="w-full bg-zinc-950/85 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 font-sans"
                  id="field-edit-account-name"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditAccountModal(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-400 hover:text-white"
                  id="btn-cancel-edit-account"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all cursor-pointer"
                  id="btn-submit-edit-account"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image zoom light box overlay */}
      {previewImageSrc && (
        <ImageViewer
          src={previewImageSrc}
          onClose={() => setPreviewImageSrc(null)}
        />
      )}

      {/* Trade details drawer/modal */}
      {viewingTrade && (
        <TradeDetailsModal
          trade={viewingTrade}
          onClose={() => setViewingTrade(null)}
          onPreviewImage={(src) => {
            setViewingTrade(null);
            setPreviewImageSrc(src);
          }}
        />
      )}

      {/* 5. SLIDING TOAST NOTIFICATIONS STACK */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-2xl flex items-center gap-3 text-xs max-w-sm animate-fade-in ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-900/50 text-emerald-400'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-900/50 text-rose-400'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 size={16} className="shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={16} className="shrink-0" />}
            {toast.type === 'info' && <Info size={16} className="shrink-0" />}

            <span>{toast.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
