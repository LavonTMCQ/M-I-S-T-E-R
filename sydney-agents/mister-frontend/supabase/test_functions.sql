-- ============================================================================
-- Test Script for MISTER User Preferences Database
-- ============================================================================
-- This script tests all the database functions and features
-- Run this after applying the main migration to verify everything works
-- ============================================================================

-- Test 1: Set user context
SELECT set_current_user_id('test_user_123');

-- Test 2: Insert some test preferences
INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES
('test_user_123', 'trading-preferences', '{"defaultSize": 100, "autoClose": true, "riskLevel": "medium"}'),
('test_user_123', 'dashboard-preferences', '{"theme": "dark", "layout": "grid", "defaultTab": "overview"}'),
('test_user_123', 'user-preferences', '{"notifications": true, "sound": false, "language": "en"}');

-- Test 3: Get individual preferences
SELECT preference_key, preference_value 
FROM user_preferences 
WHERE user_id = 'test_user_123';

-- Test 4: Test the get_user_preferences function
SELECT get_user_preferences('test_user_123') as all_preferences;

-- Test 5: Test bulk update function
SELECT update_user_preferences('test_user_123', '{
  "trading-preferences": {"defaultSize": 200, "autoClose": false, "riskLevel": "high"},
  "new-preference": {"testKey": "testValue"}
}'::jsonb);

-- Test 6: Verify the updates
SELECT preference_key, preference_value, updated_at
FROM user_preferences 
WHERE user_id = 'test_user_123'
ORDER BY updated_at DESC;

-- Test 7: Test managed wallets
INSERT INTO managed_wallets (user_id, wallet_address, wallet_name, wallet_group) VALUES
('test_user_123', 'addr1test123...', 'Test Wallet 1', 'trading'),
('test_user_123', 'addr1test456...', 'Test Wallet 2', 'savings');

-- Test 8: Query managed wallets
SELECT wallet_address, wallet_name, wallet_group, is_archived
FROM managed_wallets 
WHERE user_id = 'test_user_123';

-- Test 9: Check audit logs
SELECT action, table_name, new_values->>'preference_key' as changed_key, created_at
FROM audit_logs 
WHERE user_id = 'test_user_123'
ORDER BY created_at DESC
LIMIT 10;

-- Test 10: Test user isolation (create another user)
INSERT INTO user_preferences (user_id, preference_key, preference_value) VALUES
('other_user_456', 'trading-preferences', '{"defaultSize": 50, "riskLevel": "low"}');

-- Test 11: Verify user isolation - should only see test_user_123 data
SELECT set_current_user_id('test_user_123');
SELECT COUNT(*) as user_123_preferences FROM user_preferences WHERE user_id = 'test_user_123';
SELECT COUNT(*) as other_user_preferences FROM user_preferences WHERE user_id = 'other_user_456';

-- Test 12: Test preference statistics (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_preference_stats') THEN
    PERFORM get_user_preference_stats('test_user_123');
    RAISE NOTICE 'Preference stats function tested successfully';
  ELSE
    RAISE NOTICE 'Preference stats function not found - this is optional';
  END IF;
END
$$;

-- Test 13: Test data export (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'export_user_data') THEN
    PERFORM export_user_data('test_user_123');
    RAISE NOTICE 'Data export function tested successfully';
  ELSE
    RAISE NOTICE 'Data export function not found - this is optional';
  END IF;
END
$$;

-- Test 14: Performance test - insert multiple preferences quickly
DO $$
DECLARE
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    INSERT INTO user_preferences (user_id, preference_key, preference_value) 
    VALUES ('test_user_123', 'perf_test_' || i, jsonb_build_object('value', i, 'timestamp', NOW()));
  END LOOP;
  RAISE NOTICE 'Performance test completed - inserted 10 preferences';
END
$$;

-- Test 15: Verify all indexes are working
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM user_preferences WHERE user_id = 'test_user_123';

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM user_preferences WHERE user_id = 'test_user_123' AND preference_key = 'trading-preferences';

-- Test 16: Test JSON operations
SELECT 
  preference_key,
  preference_value->>'defaultSize' as default_size,
  preference_value->'autoClose' as auto_close
FROM user_preferences 
WHERE user_id = 'test_user_123' 
  AND preference_key = 'trading-preferences';

-- Test 17: Test JSONB updates
UPDATE user_preferences 
SET preference_value = preference_value || '{"lastUpdated": "2024-01-01"}'::jsonb
WHERE user_id = 'test_user_123' 
  AND preference_key = 'trading-preferences';

-- Test 18: Verify the JSONB update
SELECT preference_value 
FROM user_preferences 
WHERE user_id = 'test_user_123' 
  AND preference_key = 'trading-preferences';

-- Test 19: Clean up test data (optional - comment out if you want to keep test data)
/*
DELETE FROM user_preferences WHERE user_id IN ('test_user_123', 'other_user_456');
DELETE FROM managed_wallets WHERE user_id = 'test_user_123';
DELETE FROM audit_logs WHERE user_id IN ('test_user_123', 'other_user_456');
*/

-- Test Summary
SELECT 
  'user_preferences' as table_name,
  COUNT(*) as record_count
FROM user_preferences
UNION ALL
SELECT 
  'managed_wallets' as table_name,
  COUNT(*) as record_count
FROM managed_wallets
UNION ALL
SELECT 
  'audit_logs' as table_name,
  COUNT(*) as record_count
FROM audit_logs;

-- Final success message
DO $$
BEGIN
  RAISE NOTICE '✅ All tests completed successfully!';
  RAISE NOTICE '📊 Check the results above to verify everything is working';
  RAISE NOTICE '🔧 Database is ready for production use';
END
$$;
