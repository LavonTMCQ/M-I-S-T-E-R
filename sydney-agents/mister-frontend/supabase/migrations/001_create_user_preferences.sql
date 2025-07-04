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

-- Enable Row Level Security
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only access their own preferences
CREATE POLICY "Users can only access their own preferences" ON user_preferences
  FOR ALL USING (
    user_id = auth.uid()::text OR 
    user_id = current_setting('app.current_user_id', true)
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_preferences_updated_at 
  BEFORE UPDATE ON user_preferences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

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

-- Enable RLS for managed wallets
ALTER TABLE managed_wallets ENABLE ROW LEVEL SECURITY;

-- RLS policy for managed wallets
CREATE POLICY "Users can only access their own managed wallets" ON managed_wallets
  FOR ALL USING (
    user_id = auth.uid()::text OR 
    user_id = current_setting('app.current_user_id', true)
  );

-- Add updated_at trigger for managed wallets
CREATE TRIGGER update_managed_wallets_updated_at 
  BEFORE UPDATE ON managed_wallets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

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

-- Enable RLS for audit logs (users can only see their own logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policy for audit logs
CREATE POLICY "Users can only access their own audit logs" ON audit_logs
  FOR SELECT USING (
    user_id = auth.uid()::text OR 
    user_id = current_setting('app.current_user_id', true)
  );

-- Create function to log changes
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

-- Create audit triggers
CREATE TRIGGER audit_user_preferences
  AFTER INSERT OR UPDATE OR DELETE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION log_changes();

CREATE TRIGGER audit_managed_wallets
  AFTER INSERT OR UPDATE OR DELETE ON managed_wallets
  FOR EACH ROW EXECUTE FUNCTION log_changes();

-- Create function to set current user context for RLS
CREATE OR REPLACE FUNCTION set_current_user_id(user_id_param TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id_param, true);
END;
$$ language 'plpgsql';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON user_preferences TO anon, authenticated;
GRANT ALL ON managed_wallets TO anon, authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION set_current_user_id TO anon, authenticated;
