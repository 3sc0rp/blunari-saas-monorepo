#!/usr/bin/env node

/**
 * Test Script for Update Reservation Function
 * 
 * This script tests the update-reservation Edge Function to ensure it works properly
 * after fixing the CORS and error handling issues.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZmJia2NheGh6bG5icXh3Z296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ3NzExMTksImV4cCI6MjA0MDM0NzExOX0.YGBsbGSe-Y8hbhcXRnrXtlJS9q-CvYc4oUjgKZ_KlJE'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testUpdateReservation() {
  try {
    console.log('🧪 Testing Update Reservation Function...')
    
    // First, let's get a reservation to update
    const { data: reservations, error: fetchError } = await supabase
      .from('reservations')
      .select('*')
      .limit(1)
    
    if (fetchError) {
      console.error('❌ Error fetching reservations:', fetchError)
      return
    }
    
    if (!reservations || reservations.length === 0) {
      console.log('❌ No reservations found to test with')
      return
    }
    
    const reservation = reservations[0]
    console.log(`📋 Found reservation to test with: ${reservation.id}`)
    console.log(`   Current status: ${reservation.status}`)
    console.log(`   Guest: ${reservation.guest_name}`)
    
    // Test 1: Update reservation status
    console.log('\n📝 Test 1: Updating reservation status...')
    
    const updateResponse = await fetch(`${SUPABASE_URL}/functions/v1/update-reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        reservationId: reservation.id,
        status: 'CONFIRMED'
      })
    })
    
    if (!updateResponse.ok) {
      console.error(`❌ Update failed with status: ${updateResponse.status}`)
      const errorText = await updateResponse.text()
      console.error('Error details:', errorText)
      return
    }
    
    const updateResult = await updateResponse.json()
    console.log('✅ Update successful!')
    console.log('Response:', JSON.stringify(updateResult, null, 2))
    
    // Test 2: Update reservation time
    console.log('\n📝 Test 2: Updating reservation time...')
    
    const newStartTime = new Date()
    newStartTime.setHours(19, 0, 0, 0) // 7:00 PM today
    const newEndTime = new Date(newStartTime)
    newEndTime.setMinutes(newEndTime.getMinutes() + 90) // 90 minutes later
    
    const timeUpdateResponse = await fetch(`${SUPABASE_URL}/functions/v1/update-reservation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        reservationId: reservation.id,
        start: newStartTime.toISOString(),
        end: newEndTime.toISOString()
      })
    })
    
    if (!timeUpdateResponse.ok) {
      console.error(`❌ Time update failed with status: ${timeUpdateResponse.status}`)
      const errorText = await timeUpdateResponse.text()
      console.error('Error details:', errorText)
      return
    }
    
    const timeUpdateResult = await timeUpdateResponse.json()
    console.log('✅ Time update successful!')
    console.log('Response:', JSON.stringify(timeUpdateResult, null, 2))
    
    console.log('\n🎉 All tests passed! Update reservation function is working properly.')
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testUpdateReservation()