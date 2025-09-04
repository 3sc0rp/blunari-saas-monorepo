import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzNTY5NjAsImV4cCI6MjA3MTkzMjk2MH0.Ly3LKEkNUys_hHEHKDZjOgg5r8J5woPLh4_9LtvNX4s';

async function testListTables() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    // Sign in first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'deewav3@gmail.com',
      password: 'drood12D'
    });
    
    if (authError) {
      console.error('Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authenticated successfully');
    
    // Test list-tables with different approaches
    console.log('\n🧪 Testing list-tables edge function...');
    
    try {
      // Method 1: Using supabase.functions.invoke (recommended)
      console.log('Method 1: Using supabase.functions.invoke...');
      const { data, error } = await supabase.functions.invoke('list-tables', {
        method: 'GET'
      });
      
      if (error) {
        console.error('Method 1 failed:', error);
      } else {
        console.log('Method 1 success:', data);
      }
    } catch (e) {
      console.error('Method 1 exception:', e);
    }
    
    try {
      // Method 2: Direct fetch call (like in the hook)
      console.log('\nMethod 2: Using direct fetch...');
      const response = await fetch(`${supabaseUrl}/functions/v1/list-tables`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Method 2 success:', data);
      } else {
        const errorText = await response.text();
        console.error('Method 2 failed:', errorText);
      }
    } catch (e) {
      console.error('Method 2 exception:', e);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testListTables();
