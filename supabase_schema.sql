-- Run this in your Supabase SQL Editor to add the direction column (BUY/SELL)
ALTER TABLE trades 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'BUY';

-- Full trades table schema reference for Supabase:
/*
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  direction TEXT DEFAULT 'BUY', -- 'BUY' or 'SELL'
  pair TEXT NOT NULL,
  gain_loss NUMERIC NOT NULL,
  setup_type TEXT,
  session TEXT,
  rr_ratio TEXT,
  entry_reason TEXT,
  before_thought TEXT,
  after_thought TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
*/
