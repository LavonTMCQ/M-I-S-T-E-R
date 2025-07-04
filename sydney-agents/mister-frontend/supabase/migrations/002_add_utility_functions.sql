-- Additional utility functions for user preferences management

-- Function to get all preferences for a user as a single JSON object
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

-- Function to bulk update user preferences
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

-- Function to migrate localStorage data to database
CREATE OR REPLACE FUNCTION migrate_localStorage_to_db(
  user_id_param TEXT,
  localStorage_data JSONB
)
RETURNS TABLE(
  migrated_count INTEGER,
  skipped_count INTEGER,
  error_count INTEGER
) AS $$
DECLARE
  key TEXT;
  value JSONB;
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  errors INTEGER := 0;
BEGIN
  -- Set user context for RLS
  PERFORM set_current_user_id(user_id_param);
  
  -- Process each localStorage item
  FOR key, value IN SELECT * FROM jsonb_each(localStorage_data)
  LOOP
    BEGIN
      -- Skip if preference already exists in database
      IF EXISTS (
        SELECT 1 FROM user_preferences 
        WHERE user_id = user_id_param AND preference_key = key
      ) THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      
      -- Insert the preference
      INSERT INTO user_preferences (user_id, preference_key, preference_value)
      VALUES (user_id_param, key, value);
      
      migrated := migrated + 1;
      
    EXCEPTION WHEN OTHERS THEN
      errors := errors + 1;
      -- Log the error but continue processing
      INSERT INTO audit_logs (user_id, action, new_values)
      VALUES (user_id_param, 'MIGRATION_ERROR', jsonb_build_object(
        'key', key,
        'error', SQLERRM
      ));
    END;
  END LOOP;
  
  -- Log migration summary
  INSERT INTO audit_logs (user_id, action, new_values)
  VALUES (user_id_param, 'MIGRATION_COMPLETED', jsonb_build_object(
    'migrated', migrated,
    'skipped', skipped,
    'errors', errors
  ));
  
  RETURN QUERY SELECT migrated, skipped, errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user preference statistics
CREATE OR REPLACE FUNCTION get_user_preference_stats(user_id_param TEXT)
RETURNS TABLE(
  total_preferences INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE,
  most_recent_key TEXT,
  storage_size_bytes INTEGER
) AS $$
BEGIN
  -- Set user context for RLS
  PERFORM set_current_user_id(user_id_param);
  
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_preferences,
    MAX(updated_at) as last_updated,
    (SELECT preference_key FROM user_preferences 
     WHERE user_id = user_id_param 
     ORDER BY updated_at DESC LIMIT 1) as most_recent_key,
    (SELECT SUM(octet_length(preference_value::text))::INTEGER 
     FROM user_preferences 
     WHERE user_id = user_id_param) as storage_size_bytes
  FROM user_preferences 
  WHERE user_id = user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old audit logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export user data (for GDPR compliance)
CREATE OR REPLACE FUNCTION export_user_data(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Set user context for RLS
  PERFORM set_current_user_id(user_id_param);
  
  SELECT jsonb_build_object(
    'user_id', user_id_param,
    'export_date', NOW(),
    'preferences', (
      SELECT jsonb_object_agg(preference_key, preference_value)
      FROM user_preferences 
      WHERE user_id = user_id_param
    ),
    'managed_wallets', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'wallet_address', wallet_address,
          'wallet_name', wallet_name,
          'created_at', created_at,
          'is_archived', is_archived,
          'wallet_group', wallet_group
        )
      )
      FROM managed_wallets 
      WHERE user_id = user_id_param
    ),
    'audit_logs', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'action', action,
          'table_name', table_name,
          'created_at', created_at
        )
      )
      FROM audit_logs 
      WHERE user_id = user_id_param
      ORDER BY created_at DESC
      LIMIT 100  -- Limit to last 100 audit entries
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete all user data (for GDPR compliance)
CREATE OR REPLACE FUNCTION delete_user_data(user_id_param TEXT)
RETURNS JSONB AS $$
DECLARE
  deleted_prefs INTEGER;
  deleted_wallets INTEGER;
  deleted_logs INTEGER;
BEGIN
  -- Set user context for RLS
  PERFORM set_current_user_id(user_id_param);
  
  -- Delete user preferences
  DELETE FROM user_preferences WHERE user_id = user_id_param;
  GET DIAGNOSTICS deleted_prefs = ROW_COUNT;
  
  -- Delete managed wallets
  DELETE FROM managed_wallets WHERE user_id = user_id_param;
  GET DIAGNOSTICS deleted_wallets = ROW_COUNT;
  
  -- Delete audit logs
  DELETE FROM audit_logs WHERE user_id = user_id_param;
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'deleted_preferences', deleted_prefs,
    'deleted_wallets', deleted_wallets,
    'deleted_audit_logs', deleted_logs,
    'deletion_date', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for new functions
GRANT EXECUTE ON FUNCTION get_user_preferences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION migrate_localStorage_to_db TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_preference_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION export_user_data TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_data TO authenticated;

-- Only allow superuser to run cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs TO postgres;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_preferences_updated_at ON user_preferences(updated_at);
CREATE INDEX IF NOT EXISTS idx_managed_wallets_group ON managed_wallets(wallet_group);

-- Add comments for documentation
COMMENT ON FUNCTION get_user_preferences IS 'Returns all user preferences as a single JSON object';
COMMENT ON FUNCTION update_user_preferences IS 'Bulk update multiple user preferences from JSON input';
COMMENT ON FUNCTION migrate_localStorage_to_db IS 'Migrate localStorage data to database with error handling';
COMMENT ON FUNCTION get_user_preference_stats IS 'Get statistics about user preferences';
COMMENT ON FUNCTION export_user_data IS 'Export all user data for GDPR compliance';
COMMENT ON FUNCTION delete_user_data IS 'Delete all user data for GDPR compliance';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Clean up audit logs older than 30 days';
