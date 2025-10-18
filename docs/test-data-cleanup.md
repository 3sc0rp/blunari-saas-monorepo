# Test Data Cleanup System

## Overview
This system automatically identifies and removes test booking data from your database while preserving real customer bookings.

## Scripts Available

### 1. Preview Test Bookings
```bash
npm run cleanup:preview
```
- **Safe**: No data is deleted
- Shows what would be identified as test data
- Reviews detection patterns
- Recommended before cleanup

### 2. Manual Cleanup
```bash
npm run cleanup:test-data
```
- **Destructive**: Permanently deletes test bookings
- Removes bookings matching test patterns
- Preserves real customer data
- Shows summary of actions taken

### 3. Auto Cleanup
```bash
npm run cleanup:auto
```
- **Quick**: Automated cleanup without preview
- Ideal for development workflows
- Can be added to CI/CD pipelines
- Minimal output

## Test Data Detection Patterns

The system identifies test bookings by looking for these patterns:

### Names
- Contains "test", "testing", "demo", "sample", "example"
- Contains "fake", "dummy"
- Patterns like "John Test", "Test McTest", "Jane Doe"

### Emails
- `@test.com`, `@example.com`, `@demo.com`
- `@localhost`, `@tempmail.com`
- Emails starting with "test@", "demo@", "noreply@"

### Phone Numbers
- Common test patterns: 555-555-5555, 123-123-1234
- Sequential test numbers: +1234567890, +1234567891, etc.
- Placeholder patterns: 000-000-0000, 111-111-1111

### Special Requests
- Contains test-related keywords
- Sample or demo text

## Usage Recommendations

### During Development
```bash
# Before testing new features
npm run cleanup:auto

# After testing sessions
npm run cleanup:preview  # Review what accumulated
npm run cleanup:test-data  # Clean up if needed
```

### In CI/CD Pipeline
Add to your deployment script:
```bash
npm run cleanup:auto  # Clean test data before production deploy
```

### For Production Safety
Always run preview first:
```bash
npm run cleanup:preview  # Review detection
# If results look correct:
npm run cleanup:test-data  # Execute cleanup
```

## Customizing Detection

To modify what gets detected as test data, edit the `TEST_PATTERNS` array in:
- `scripts/cleanup-test-bookings.js`
- `scripts/preview-test-bookings.js` 
- `scripts/auto-cleanup.js`

Example pattern additions:
```javascript
// Add new email domains
/@mydomain\.test/i,

// Add specific test names
/automation.*user/i,

// Add phone number patterns
/\+9999999999/
```

## Safety Features

1. **Preview Mode**: Always see what will be deleted first
2. **Pattern Matching**: Only removes obvious test data
3. **Batch Processing**: Handles large datasets efficiently
4. **Error Handling**: Graceful failures with clear messages
5. **Preservation Logic**: Protects real customer data

## Verification

After cleanup, verify results:
```bash
# Check booking management page
# Should show empty state or real bookings only

# Or run preview again
npm run cleanup:preview  # Should show "No test bookings found"
```

## Troubleshooting

### Real Bookings Detected as Test
If real customer bookings are incorrectly flagged:
1. Review the detection patterns in preview mode
2. Update `TEST_PATTERNS` to exclude the false positive
3. Re-run preview to verify fix

### Cleanup Failed
- Check database connection
- Verify Supabase credentials
- Ensure proper permissions for delete operations

### Large Datasets
The system processes in batches (10 records per batch) to avoid overwhelming the API.

## Best Practices

1. **Always preview first** before running cleanup
2. **Regular maintenance** - run auto-cleanup weekly
3. **Environment separation** - use different databases for dev/staging/prod
4. **Backup critical data** before bulk operations
5. **Monitor patterns** - update detection as needed

## Integration with BookingManagement

The cleanup system works seamlessly with your BookingManagement page:
- Real-time updates after cleanup
- Automatic refresh of booking lists
- Clean metrics and status overview
- No test data pollution in analytics