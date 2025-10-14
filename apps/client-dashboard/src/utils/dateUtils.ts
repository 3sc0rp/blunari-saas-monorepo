/**
 * Timezone-safe date utilities
 * 
 * These utilities help prevent UTC drift issues when filtering bookings by date.
 * 
 * Problem: Using .toISOString().slice(0,10) for "today" can cause bookings at 11PM 
 * local time to be counted as tomorrow in UTC, or vice versa.
 * 
 * Solution: Convert dates using tenant's timezone consistently.
 */

/**
 * Format a date in a specific timezone as YYYY-MM-DD
 * Uses Intl.DateTimeFormat for timezone-aware formatting
 */
export function formatDateInTimezone(
  date: Date | string,
  timezone: string = 'UTC'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    console.warn('[dateUtils] Invalid date:', date);
    return new Date().toISOString().split('T')[0];
  }

  try {
    // Use Intl.DateTimeFormat for timezone-aware formatting
      const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // en-CA locale gives us YYYY-MM-DD format
      return formatter.format(dateObj);
  } catch (error) {
    console.error('[dateUtils] Timezone formatting error:', error);
    // Fallback to UTC
      return dateObj.toISOString().split('T')[0];
  }
}

/**
 * Get the start of a day in a specific timezone as ISO timestamp
 * Returns: "2025-10-03T00:00:00.000Z" adjusted for timezone
 */
export function getStartOfDayInTimezone(
  dateString: string,
  timezone: string = 'UTC'
): string {
  try {
    // Parse the date string as-is (YYYY-MM-DD)
      const [year, month, day] = dateString.split('-').map(Number);
    
    // Create a date string that represents midnight in the target timezone
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
    
    // Parse as local time in the target timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // Get the UTC timestamp for midnight in the target timezone
      const parts = formatter.formatToParts(new Date(dateStr));
    const tzYear = parts.find(p => p.type === 'year')?.value || year;
    const tzMonth = parts.find(p => p.type === 'month')?.value || month;
    const tzDay = parts.find(p => p.type === 'day')?.value || day;
    
    // Create date in UTC then adjust
      const utcDate = new Date(Date.UTC(+tzYear, +tzMonth - 1, +tzDay, 0, 0, 0));
    
    // Get the offset and adjust
      const localDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`);
    const offsetMinutes = getTimezoneOffset(timezone, localDate);
    
    const adjusted = new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
    return adjusted.toISOString();
  } catch (error) {
    console.error('[dateUtils] Error getting start of day:', error);
    // Fallback: assume UTC
      return `${dateString}T00:00:00.000Z`;
  }
}

/**
 * Get the end of a day in a specific timezone as ISO timestamp
 * Returns: "2025-10-03T23:59:59.999Z" adjusted for timezone
 */
export function getEndOfDayInTimezone(
  dateString: string,
  timezone: string = 'UTC'
): string {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const localDate = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:59.999`);
    const offsetMinutes = getTimezoneOffset(timezone, localDate);
    
    const utcDate = new Date(Date.UTC(+year, +month - 1, +day, 23, 59, 59, 999));
    const adjusted = new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
    return adjusted.toISOString();
  } catch (error) {
    console.error('[dateUtils] Error getting end of day:', error);
    return `${dateString}T23:59:59.999Z`;
  }
}

/**
 * Get timezone offset in minutes for a specific timezone at a specific date
 * Accounts for DST changes
 */
function getTimezoneOffset(timezone: string, date: Date): number {
  try {
    // Format the date in both UTC and target timezone
      const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    
    // Difference in minutes
      return (tzDate.getTime() - utcDate.getTime()) / (60 * 1000);
  } catch {
    return 0; // Fallback to UTC (no offset)
  }
}

/**
 * Get "today" in a specific timezone as YYYY-MM-DD
 */
export function getTodayInTimezone(timezone: string = 'UTC'): string {
  return formatDateInTimezone(new Date(), timezone);
}

/**
 * Check if a timestamp falls within a specific date in a given timezone
 */
export function isTimestampOnDate(
  timestamp: string | Date,
  dateString: string,
  timezone: string = 'UTC'
): boolean {
  try {
    const ts = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const dateInTz = formatDateInTimezone(ts, timezone);
    return dateInTz === dateString;
  } catch {
    return false;
  }
}

/**
 * Convert a local date string (YYYY-MM-DD) to a Date object at midnight in timezone
 */
export function dateStringToDateInTimezone(
  dateString: string,
  timezone: string = 'UTC'
): Date {
  const isoStart = getStartOfDayInTimezone(dateString, timezone);
  return new Date(isoStart);
}

/**
 * Get date range for a specific date in a timezone
 * Returns { start, end } as ISO timestamps
 */
export function getDateRangeInTimezone(
  dateString: string,
  timezone: string = 'UTC'
): { start: string; end: string } {
  return {
    start: getStartOfDayInTimezone(dateString, timezone),
    end: getEndOfDayInTimezone(dateString, timezone),
  };
}

/**
 * Format a timestamp for display in a specific timezone
 */
export function formatTimestampInTimezone(
  timestamp: string | Date,
  timezone: string = 'UTC',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }
): string {
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone,
    }).format(date);
  } catch (error) {
    console.error('[dateUtils] Error formatting timestamp:', error);
    return String(timestamp);
  }
}

/**
 * Get list of common timezone names (for UI dropdowns)
 */
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
  { value: 'UTC', label: 'UTC' },
] as const;

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse a date range filter accounting for timezone
 * Common use: filtering bookings for a specific day
 */
export interface DateRangeFilter {
  gte: string; // Greater than or equal (start of day)
  lt: string;  // Less than (start of next day)
}

export function createDateFilter(
  dateString: string,
  timezone: string = 'UTC'
): DateRangeFilter {
  const { start, end } = getDateRangeInTimezone(dateString, timezone);
  
  return {
    gte: start,
    lt: end,
  };
}

/**
 * Example usage in Supabase queries:
 * 
 * const filter = createDateFilter('2025-10-03', tenantTimezone);
 * const { data } = await supabase
 *   .from('bookings')
 *   .select('*')
 *   .gte('booking_time', filter.gte)
 *   .lt('booking_time', filter.lt);
 */


