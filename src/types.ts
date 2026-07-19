export interface Account {
  id: string;
  user_id: string;
  name: string;
  instrument: string;
  starting_balance: number;
  created_at: string;
}

export interface Trade {
  id: string;
  user_id: string;
  account_id: string;
  trade_date: string;
  pair: string;
  gain_loss: number;
  setup_type: string;
  session: string;
  rr_ratio: string;
  entry_reason?: string;
  before_thought?: string;
  after_thought?: string;
  images: string[]; // URLs or base64 data strings stored in the JSONB column
  rating?: number; // 1-5 star rating
  created_at: string;
}

export type SetupType =
  | 'Breakout'
  | 'Support/Resistance'
  | 'Trend'
  | 'Range'
  | 'Scalp'
  | 'News'
  | 'Other';

export type TradingSession =
  | 'Asian (Tokyo)'
  | 'London'
  | 'New York'
  | 'Multiple Sessions';

export type TradingPair =
  | 'EURUSD'
  | 'Gold'
  | 'Silver'
  | 'Oil'
  | 'US30'
  | 'SPX500'
  | 'NAS100'
  | 'BTC/USD';

export const TRADING_PAIRS: TradingPair[] = [
  'EURUSD',
  'Gold',
  'Silver',
  'Oil',
  'US30',
  'SPX500',
  'NAS100',
  'BTC/USD'
];

export const SETUP_TYPES: SetupType[] = [
  'Breakout',
  'Support/Resistance',
  'Trend',
  'Range',
  'Scalp',
  'News',
  'Other'
];

export const TRADING_SESSIONS: TradingSession[] = [
  'Asian (Tokyo)',
  'London',
  'New York',
  'Multiple Sessions'
];

export interface DashboardStats {
  currentBalance: number;
  netPnL: number;
  winRate: number;
  consistencyScore: number;
  streak: string;
  bestPair: string;
}

export interface FilterState {
  startDate: string;
  endDate: string;
  daysOfWeek: number[]; // 1 = Monday, ..., 5 = Friday
}
