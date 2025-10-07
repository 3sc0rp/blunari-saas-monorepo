-- 🔍 IDENTIFY THE PROBLEMATIC TRIGGER
-- This script shows you which trigger is causing the issue

-- Show all triggers on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
ORDER BY trigger_name;

-- Show the audit trigger that's causing issues
SELECT 
  'The problematic trigger:' as info,
  'audit_all_sensitive_operations' as trigger_name,
  'This trigger expects a "status" column which profiles table does not have' as problem;

-- Solution 1: Fix the trigger to check table name properly
SELECT 
  'SOLUTION 1: Update the trigger function to check table structure' as solution,
  'The trigger should only check status field for tables that have it' as explanation;

-- Solution 2: Disable trigger temporarily
SELECT 
  'SOLUTION 2: Temporarily disable triggers when updating profiles' as solution,
  'Use: ALTER TABLE profiles DISABLE TRIGGER ALL; ...updates... ALTER TABLE profiles ENABLE TRIGGER ALL;' as how_to;

-- Solution 3: Use service role to bypass RLS and triggers
SELECT 
  'SOLUTION 3: Use the "Regenerate Credentials" button in Admin Dashboard' as solution,
  'This uses the edge function which has service role access' as how_to;
