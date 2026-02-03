-- Migration: create_subscriptions_table
-- Story 1.11: Démarrage Essai Gratuit
--
-- Creates the subscriptions table for storing IAP subscription data.
-- AC#3: Receipt validation côté serveur (NFR-I4)
--
-- RLS Strategy:
-- - SELECT: User can view own subscription
-- - INSERT/UPDATE: Only via Edge Function (service_role bypasses RLS)

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  product_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  original_transaction_id TEXT UNIQUE NOT NULL,
  trial_ends_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renewing BOOLEAN DEFAULT true,
  raw_receipt JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment to table
COMMENT ON TABLE public.subscriptions IS 'Store IAP subscription data validated via Edge Function';

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own subscription
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Note: No INSERT/UPDATE policies for users
-- Edge Function uses service_role key which bypasses RLS
-- This ensures all subscriptions are validated server-side before insertion

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();
