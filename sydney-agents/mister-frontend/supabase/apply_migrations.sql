-- ============================================================================
-- MISTER User Preferences Database Setup
-- ============================================================================
-- This script sets up the complete database schema for user preferences
-- Copy and paste this into the Supabase SQL Editor to apply all changes
-- ============================================================================

-- Check if user_preferences table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
    -- Create user preferences table that mirrors our localStorage structure
    CREATE TABLE user_preferences (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      preference_key TEXT NOT NULL,
      preference_value JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      
      -- Ensure unique combination of user_id and preference_key
      UNIQUE(user_id, preference_key)
    );

    -- Create index for efficient user-specific queries
    CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
    CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);
    CREATE INDEX idx_user_preferences_user_key ON user_preferences(user_id, preference_key);

    RAISE NOTICE 'Created user_preferences table';
  ELSE
    RAISE NOTICE 'user_preferences table already exists';
  END IF;
END
$$;

-- Check if managed_wallets table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'managed_wallets') THEN
    -- Create managed wallets table for user-specific wallet data
    CREATE TABLE managed_wallets (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT NOT NULL,
      wallet_address TEXT NOT NULL,
      wallet_name TEXT,
      mnemonic_encrypted TEXT, -- Encrypted mnemonic phrase
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      is_archived BOOLEAN DEFAULT FALSE,
      wallet_group TEXT DEFAULT 'default',
      
      -- Ensure unique wallet address per user
      UNIQUE(user_id, wallet_address)
    );

    -- Create index for efficient managed wallet queries
    CREATE INDEX idx_managed_wallets_user_id ON managed_wallets(user_id);
    CREATE INDEX idx_managed_wallets_address ON managed_wallets(wallet_address);
    CREATE INDEX idx_managed_wallets_user_active ON managed_wallets(user_id, is_archived);

    RAISE NOTICE 'Created managed_wallets table';
  ELSE
    RAISE NOTICE 'managed_wallets table already exists';
  END IF;
END
$$;

-- Check if audit_logs table already exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    -- Create audit log table for security monitoring
    CREATE TABLE audit_logs (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      table_name TEXT,
      record_id TEXT,
      old_values JSONB,
      new_values JSONB,
      ip_address INET,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Create index for audit log queries
    CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
    CREATE INDEX idx_audit_logs_action ON audit_logs(action);

    RAISE NOTICE 'Created audit_logs table';
  ELSE
    RAISE NOTICE 'audit_logs table already exists';
  END IF;
END
$$;

-- Create or replace utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create or replace user context function
CREATE OR REPLACE FUNCTION set_current_user_id(user_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id_param, true);
END;
$$ language 'plpgsql';

-- Create or replace audit logging function
CREATE OR REPLACE FUNCTION log_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values
  ) VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id::text, OLD.id::text),
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create utility functions for user preferences
CREATE OR REPLACE FUNCTION get_user_preferences(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB := '{}';
  pref RECORD;
BEGIN
  -- Set user context for RLS
  PERFORM set_current_user_id(user_id_param);
  
  -- Build JSON object from all user preferences
  FOR pref IN 
    SELECT preference_key, preference_value 
    FROM user_preferences 
    WHERE user_id = user_id_param
  LOOP
    result := result || jsonb_build_object(pref.preference_key, pref.preference_value);
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bulk update function
CREATE OR REPLACE FUNCTION update_user_preferences(
  user_id_param TEXT,
  preferences_param JSONB
)
RETURNS VOID AS $$
DECLARE
  key TEXT;
  value JSONB;
BEGIN
  -- Set user context for RLS
  PERFORM set_current_user_id(user_id_param);
  
  -- Iterate through each key-value pair in the input JSON
  FOR key, value IN SELECT * FROM jsonb_each(preferences_param)
  LOOP
    INSERT INTO user_preferences (user_id, preference_key, preference_value)
    VALUES (user_id_param, key, value)
    ON CONFLICT (user_id, preference_key)
    DO UPDATE SET 
      preference_value = EXCLUDED.preference_value,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers (only if they don't exist)
DO $$
BEGIN
  -- Update triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_preferences_updated_at') THEN
    CREATE TRIGGER update_user_preferences_updated_at 
      BEFORE UPDATE ON user_preferences 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_managed_wallets_updated_at') THEN
    CREATE TRIGGER update_managed_wallets_updated_at 
      BEFORE UPDATE ON managed_wallets 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  -- Audit triggers
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_user_preferences') THEN
    CREATE TRIGGER audit_user_preferences
      AFTER INSERT OR UPDATE OR DELETE ON user_preferences
      FOR EACH ROW EXECUTE FUNCTION log_changes();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_managed_wallets') THEN
    CREATE TRIGGER audit_managed_wallets
      AFTER INSERT OR UPDATE OR DELETE ON managed_wallets
      FOR EACH ROW EXECUTE FUNCTION log_changes();
  END IF;
END
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_preferences TO anon, authenticated;
GRANT ALL ON managed_wallets TO anon, authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_id TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_preferences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences TO anon, authenticated;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);
CREATE INDEX IF NOT EXISTS idx_managed_wallets_group ON managed_wallets(wallet_group);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- Add helpful comments
COMMENT ON TABLE user_preferences IS 'Stores user preferences with JSONB values for flexibility';
COMMENT ON TABLE managed_wallets IS 'Stores user-managed wallet information';
COMMENT ON TABLE audit_logs IS 'Audit trail for all database changes';

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ Database setup completed successfully!';
  RAISE NOTICE '📊 Tables created: user_preferences, managed_wallets, audit_logs';
  RAISE NOTICE '🔧 Functions created: set_current_user_id, get_user_preferences, update_user_preferences';
  RAISE NOTICE '🔄 Triggers created: update timestamps and audit logging';
  RAISE NOTICE '🔒 Permissions granted for anon and authenticated users';
END
$$;
