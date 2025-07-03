#!/usr/bin/env node

/**
 * Database Synchronization Script
 * Ensures the local project is in sync with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseConnection() {
  try {
    console.log('🔄 Checking database connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    return false;
  }
}

async function validateSchema() {
  try {
    console.log('🔄 Validating database schema...');
    
    // Check if required tables exist
    const requiredTables = [
      'users', 'referrals', 'daily_tasks', 'fixed_tasks', 
      'mining_sessions', 'user_daily_tasks', 'user_fixed_tasks'
    ];
    
    for (const table of requiredTables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.error(`❌ Table '${table}' validation failed:`, error.message);
        return false;
      }
    }
    
    console.log('✅ Schema validation successful');
    return true;
  } catch (error) {
    console.error('❌ Schema validation error:', error.message);
    return false;
  }
}

async function checkRPCFunctions() {
  try {
    console.log('🔄 Checking RPC functions...');
    
    // Test a simple RPC function
    const { data, error } = await supabase.rpc('register_telegram_user', {
      p_telegram_id: 'test_sync_check',
      p_supabase_auth_id: '00000000-0000-0000-0000-000000000000',
      p_username: 'Test User',
      p_level: 1
    });
    
    if (error && !error.message.includes('duplicate key')) {
      console.error('❌ RPC function test failed:', error.message);
      return false;
    }
    
    // Clean up test data
    await supabase.from('users').delete().eq('telegram_id', 'test_sync_check');
    
    console.log('✅ RPC functions working correctly');
    return true;
  } catch (error) {
    console.error('❌ RPC function check error:', error.message);
    return false;
  }
}

async function syncDatabase() {
  console.log('🚀 Starting database synchronization...\n');
  
  const connectionOk = await checkDatabaseConnection();
  if (!connectionOk) {
    console.log('\n❌ Synchronization failed: Database connection issues');
    process.exit(1);
  }
  
  const schemaOk = await validateSchema();
  if (!schemaOk) {
    console.log('\n❌ Synchronization failed: Schema validation issues');
    console.log('💡 Try running the migration: supabase/migrations/fix_sync_issues.sql');
    process.exit(1);
  }
  
  const rpcOk = await checkRPCFunctions();
  if (!rpcOk) {
    console.log('\n❌ Synchronization failed: RPC function issues');
    console.log('💡 Check if all database functions are properly deployed');
    process.exit(1);
  }
  
  console.log('\n✅ Database synchronization completed successfully!');
  console.log('🎉 Your project is now in sync with Supabase');
}

// Run the synchronization
syncDatabase().catch(error => {
  console.error('\n❌ Synchronization error:', error);
  process.exit(1);
});