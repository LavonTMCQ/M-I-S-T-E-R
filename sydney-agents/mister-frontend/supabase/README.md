# 🗄️ MISTER Supabase Database Setup

This directory contains all the database migrations and utilities for the MISTER user preferences system.

## 📁 Files Overview

- **`apply_migrations.sql`** - Complete database setup script (copy-paste into Supabase SQL Editor)
- **`test_functions.sql`** - Test script to verify all functions work correctly
- **`migrations/`** - Individual migration files for version control
- **`config.toml`** - Supabase CLI configuration

## 🚀 Quick Setup

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navigate to your project: `mister-production`

2. **Run the Migration**
   - Click on "SQL Editor" in the sidebar
   - Copy the entire contents of `apply_migrations.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify Setup**
   - Copy the contents of `test_functions.sql`
   - Paste and run in SQL Editor
   - Check that all tests pass

### Option 2: Using Supabase CLI (If you have project access)

```bash
# Initialize Supabase (already done)
supabase init

# Link to remote project (requires permissions)
supabase link --project-ref bdhmvezqfrgceinysjpi

# Apply migrations
supabase db push
```

## 📊 Database Schema

### Tables Created

#### `user_preferences`
- **Purpose**: Stores user preferences as JSONB
- **Columns**: `id`, `user_id`, `preference_key`, `preference_value`, `created_at`, `updated_at`
- **Indexes**: User ID, preference key, composite indexes
- **Constraints**: Unique (user_id, preference_key)

#### `managed_wallets`
- **Purpose**: Stores user-managed wallet information
- **Columns**: `id`, `user_id`, `wallet_address`, `wallet_name`, `mnemonic_encrypted`, `created_at`, `updated_at`, `is_archived`, `wallet_group`
- **Indexes**: User ID, wallet address, active wallets
- **Constraints**: Unique (user_id, wallet_address)

#### `audit_logs`
- **Purpose**: Audit trail for all database changes
- **Columns**: `id`, `user_id`, `action`, `table_name`, `record_id`, `old_values`, `new_values`, `ip_address`, `user_agent`, `created_at`
- **Indexes**: User ID, action, created date

### Functions Created

#### Core Functions
- **`set_current_user_id(user_id)`** - Sets user context for RLS
- **`get_user_preferences(user_id)`** - Returns all preferences as JSON
- **`update_user_preferences(user_id, preferences_json)`** - Bulk update preferences

#### Utility Functions
- **`update_updated_at_column()`** - Trigger function for timestamps
- **`log_changes()`** - Trigger function for audit logging

#### Advanced Functions (Optional)
- **`migrate_localStorage_to_db(user_id, data)`** - Migration helper
- **`get_user_preference_stats(user_id)`** - Usage statistics
- **`export_user_data(user_id)`** - GDPR data export
- **`delete_user_data(user_id)`** - GDPR data deletion
- **`cleanup_old_audit_logs()`** - Maintenance function

## 🔒 Security Features

### Row Level Security (RLS)
- **Enabled** on all tables
- **Policies** ensure users can only access their own data
- **Context function** allows setting user ID for queries

### Audit Logging
- **Automatic logging** of all INSERT/UPDATE/DELETE operations
- **Detailed tracking** of old and new values
- **User attribution** for all changes

### Data Isolation
- **Complete separation** between users
- **No cross-user data access** possible
- **Secure by default** configuration

## 🔧 Usage Examples

### JavaScript/TypeScript Integration

```typescript
// Using the Supabase client
import { supabase } from '@/lib/supabase/client';

// Set user context
await supabase.rpc('set_current_user_id', { user_id_param: 'user123' });

// Get all preferences
const { data } = await supabase.rpc('get_user_preferences', { user_id_param: 'user123' });

// Update preferences
await supabase.rpc('update_user_preferences', {
  user_id_param: 'user123',
  preferences_param: {
    'trading-preferences': { defaultSize: 100, autoClose: true },
    'dashboard-preferences': { theme: 'dark', layout: 'grid' }
  }
});
```

### Direct SQL Usage

```sql
-- Set user context
SELECT set_current_user_id('user123');

-- Insert a preference
INSERT INTO user_preferences (user_id, preference_key, preference_value)
VALUES ('user123', 'trading-preferences', '{"defaultSize": 100}');

-- Get all preferences
SELECT get_user_preferences('user123');

-- Bulk update
SELECT update_user_preferences('user123', '{
  "trading-preferences": {"defaultSize": 200},
  "new-setting": {"enabled": true}
}'::jsonb);
```

## 🧪 Testing

### Run All Tests
```sql
-- Copy and paste test_functions.sql into Supabase SQL Editor
-- This will create test data and verify all functions work
```

### Manual Testing
```sql
-- Test user isolation
SELECT set_current_user_id('test_user');
INSERT INTO user_preferences (user_id, preference_key, preference_value)
VALUES ('test_user', 'test_pref', '{"value": "test"}');

-- Verify data exists
SELECT * FROM user_preferences WHERE user_id = 'test_user';

-- Test another user can't see this data
SELECT set_current_user_id('other_user');
SELECT * FROM user_preferences WHERE user_id = 'test_user'; -- Should return empty
```

## 📈 Performance Considerations

### Indexes
- **Composite indexes** for common query patterns
- **JSONB GIN indexes** for preference value searches
- **Partial indexes** for active/archived data

### Query Optimization
- **Use RPC functions** for complex operations
- **Batch updates** with `update_user_preferences`
- **Limit audit log queries** with date ranges

### Monitoring
```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE tablename IN ('user_preferences', 'managed_wallets', 'audit_logs');

-- Check index usage
SELECT 
  indexrelname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE relname IN ('user_preferences', 'managed_wallets', 'audit_logs');
```

## 🔄 Maintenance

### Regular Tasks
```sql
-- Clean up old audit logs (run monthly)
SELECT cleanup_old_audit_logs();

-- Check database statistics
SELECT 
  COUNT(*) as total_users,
  AVG(pref_count) as avg_preferences_per_user
FROM (
  SELECT user_id, COUNT(*) as pref_count
  FROM user_preferences
  GROUP BY user_id
) user_stats;
```

### Backup Considerations
- **Preferences data** is critical for user experience
- **Audit logs** may be required for compliance
- **Managed wallets** contain sensitive encrypted data

## 🆘 Troubleshooting

### Common Issues

1. **Permission Denied**
   ```sql
   -- Check RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'user_preferences';
   
   -- Verify user context is set
   SELECT current_setting('app.current_user_id', true);
   ```

2. **Function Not Found**
   ```sql
   -- List all custom functions
   SELECT proname, proargnames 
   FROM pg_proc 
   WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
     AND proname LIKE '%user%';
   ```

3. **Slow Queries**
   ```sql
   -- Check query plans
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM user_preferences WHERE user_id = 'your_user_id';
   ```

### Debug Mode
```sql
-- Enable detailed logging
SET log_statement = 'all';
SET log_min_duration_statement = 0;
```

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSONB Documentation](https://www.postgresql.org/docs/current/datatype-json.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**✅ Database setup is complete and ready for production use!**
