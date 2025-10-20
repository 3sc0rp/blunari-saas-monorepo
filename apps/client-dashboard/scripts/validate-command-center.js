/**
 * Command Center Manual Validation Script
 * 
 * This script helps validate that Command Center filtering works correctly.
 * Run this in the browser console on the Command Center page.
 */

(function() {
console.log('🔍 Command Center Filtering Validation');
console.log('=====================================');

// Function to validate filter functionality
function validateCommandCenter() {
  const results = {
    filtersPresent: false,
    reservationCountVisible: false,
    kpisUpdating: false,
    realtimeConnected: false,
    dataLoaded: false
  };

  try {
    // Check if filter elements are present
    const partyFilter = document.querySelector('[aria-label*="Party Size"], button:contains("Party Size")');
    const channelFilter = document.querySelector('[aria-label*="Channel"], button:contains("Channel")');
    const statusFilter = document.querySelector('[aria-label*="Status"], button:contains("Status")');
    
    results.filtersPresent = !!(partyFilter && channelFilter && statusFilter);
    console.log(`✅ Filters present: ${results.filtersPresent}`);

    // Check if reservation count is visible
    const reservationCount = document.querySelector('*[textContent*="Showing"], *[textContent*="reservations"]');
    results.reservationCountVisible = !!reservationCount;
    console.log(`✅ Reservation count visible: ${results.reservationCountVisible}`);

    // Check if KPIs are present
    const kpiElements = document.querySelectorAll('[aria-label*="Total Bookings"], [aria-label*="Confirmed"]');
    results.kpisUpdating = kpiElements.length > 0;
    console.log(`✅ KPIs present: ${results.kpisUpdating}`);

    // Check for real-time connection indicator
    const liveIndicator = document.querySelector('*[textContent*="Live"], *[textContent*="Connected"]');
    results.realtimeConnected = !!liveIndicator;
    console.log(`✅ Real-time indicator: ${results.realtimeConnected}`);

    // Check if data is loaded (look for reservation data)
    const timeline = document.querySelector('[aria-label*="timeline"], [aria-label*="Timeline"]');
    const tables = document.querySelectorAll('*[textContent*="Table"]');
    results.dataLoaded = !!(timeline && tables.length > 0);
    console.log(`✅ Data loaded: ${results.dataLoaded}`);

    console.log('\\n📊 Validation Summary:');
    console.log('====================');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
    });

    const allPassed = Object.values(results).every(v => v);
    console.log(`\\n🎯 Overall Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    return results;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return results;
  }
}

// Function to test filtering manually
function testFiltering() {
  console.log('\\n🧪 Testing Filter Functionality');
  console.log('===============================');

  try {
    // Try to click party size filter
    const partyFilter = document.querySelector('button:contains("Party Size")');
    if (partyFilter) {
      console.log('📝 Found Party Size filter, attempting to click...');
      partyFilter.click();
      setTimeout(() => {
        const partySize4 = document.querySelector('button:contains("4")');
        if (partySize4) {
          console.log('📝 Clicking party size 4...');
          partySize4.click();
          setTimeout(() => {
            console.log('✅ Party size filter applied');
          }, 500);
        }
      }, 500);
    }

    // Check for filter result updates
    setTimeout(() => {
      const filteredIndicator = document.querySelector('*[textContent*="filtered"]');
      if (filteredIndicator) {
        console.log('✅ Filter results indicator found');
      } else {
        console.log('❌ No filter results indicator found');
      }
    }, 1000);

  } catch (error) {
    console.error('❌ Filter testing failed:', error);
  }
}

// Run validation
console.log('🚀 Starting Command Center validation...');
const results = validateCommandCenter();

// Test filtering after a delay
setTimeout(() => {
  testFiltering();
}, 2000);

// Monitor for real-time updates
let updateCount = 0;
const monitorUpdates = setInterval(() => {
  updateCount++;
  if (updateCount > 10) {
    clearInterval(monitorUpdates);
    console.log('🔄 Real-time monitoring completed');
    return;
  }
  
  const timestamp = new Date().toLocaleTimeString();
  console.log(`🔄 Monitoring update ${updateCount} at ${timestamp}`);
}, 5000);

console.log('\\n📋 Manual Testing Checklist:');
console.log('=============================');
console.log('1. ✅ Check if filters show dynamic counts (not all zeros)');
console.log('2. ✅ Click Party Size filter and select a size');
console.log('3. ✅ Verify reservation count updates to show "X of Y reservations (filtered)"');
console.log('4. ✅ Check if KPI cards update to reflect filtered data');
console.log('5. ✅ Click "Clear all filters" button');
console.log('6. ✅ Verify all reservations are shown again');
console.log('7. ✅ Test Channel and Status filters similarly');
console.log('8. ✅ Check real-time connection status indicator');

return {
  validate: validateCommandCenter,
  testFiltering: testFiltering,
  results: results
};
})();