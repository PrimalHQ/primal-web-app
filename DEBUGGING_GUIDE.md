# Bloom Filter Debug Guide

## Overview
The bloom filter implementation has been converted from relay-based to localStorage-only. This guide helps debug why notes might not be getting filtered.

## Changes Made

1. **Removed all relay-related code** from `SeenNotesManager`
2. **Added localStorage persistence** with user-specific keys
3. **Added comprehensive logging** to all filter operations
4. **Added debug helper functions** available in browser console

## How to Debug

### 1. Open Browser Console
Open the developer tools in your browser and check the console for log messages.

### 2. Look for These Log Messages

**Initialization:**
- `SeenNotesManager: Initialized for pubkey [pubkey]`
- `SeenNotesManager: Starting initialization`
- `FeedIntegration: Account available, pubkey: [pubkey]`
- `FeedIntegration: Manager initialized successfully`

**Filter Operations:**
- `SeenNotesIntegration: Effect triggered with X notes`
- `FeedIntegration: filterSeenNotes called with X notes`
- `SeenNotesManager: Checking if note "[noteId]" should be shown`
- `BloomFilter: Item "[noteId]" NOT FOUND in filter` (note will be shown)
- `BloomFilter: Item "[noteId]" FOUND in filter` (note will be hidden)

**Note Tracking:**
- `SeenNotesIntegration: setupNoteTracking called for note [noteId]`
- `NoteVisibilityTracker: Found X existing note elements to observe`
- `SeenNotesManager: Note "[noteId]" came into view - starting 3000ms timer`
- `SeenNotesManager: Timeout expired for note "[noteId]" - marking as seen`
- `BloomFilter: Adding item "[noteId]" to filter`

### 3. Use Debug Helper Functions

In the browser console, these functions are available:

```javascript
// Check localStorage data
window.debugSeenNotes.getStats()

// List all localStorage keys and values
window.debugSeenNotes.listStorage()

// Clear all filters (for testing)
window.debugSeenNotes.clearAll()
```

### 4. Check localStorage Directly

In browser console:
```javascript
// List all seen notes keys
Object.keys(localStorage).filter(key => key.includes('seen_notes'))

// Check specific keys (replace [pubkey] with actual pubkey)
localStorage.getItem('seen_notes_new_filter_[pubkey]')
localStorage.getItem('seen_notes_metadata_[pubkey]')
```

## Common Issues & Solutions

### Issue 1: No logs appearing
**Problem:** The filter isn't being initialized
**Check:** Look for "FeedIntegration: Account available" logs
**Solution:** Make sure you're logged in with a valid account

### Issue 2: Filter enabled but notes not being tracked
**Problem:** Intersection observer not working
**Check:** Look for "NoteVisibilityTracker" logs
**Solution:** Make sure `data-note-id` attributes are being set on note elements

### Issue 3: Notes being tracked but not saved
**Problem:** localStorage operations failing
**Check:** Look for "Saved seen notes filters to localStorage" logs
**Solution:** Check browser's localStorage quota and permissions

### Issue 4: Notes not being filtered
**Problem:** Filter exists but `shouldShowNote` always returns true
**Check:** Look for "BloomFilter: Item X FOUND/NOT FOUND" logs
**Solution:** Verify bloom filter is being populated correctly

## Test Scenarios

### Test 1: Fresh Start
1. Clear all filters: `window.debugSeenNotes.clearAll()`
2. Refresh page
3. Verify initialization logs appear
4. Scroll through notes and wait for "marking as seen" logs

### Test 2: Filter Rotation
1. Scroll through many notes to fill up the filter
2. Look for "Rotating bloom filters" logs when capacity is reached
3. Verify old filter is preserved and new filter is created

### Test 3: Persistence
1. Mark several notes as seen
2. Refresh the page
3. Verify filters are loaded from localStorage
4. Check that previously seen notes don't appear

## Configuration

Current settings:
- **View timeout:** 3 seconds (note must be visible for 3s to be marked as seen)
- **Filter rotation:** Every 7 days or when 99% full
- **Intersection threshold:** 50% of note must be visible
- **Save interval:** 5 seconds between localStorage saves

## Expected Behavior

1. **On page load:** Filters load from localStorage for current user
2. **When scrolling:** Notes become "in view" and start 3-second timers
3. **After 3 seconds:** Notes are marked as seen and added to bloom filter
4. **On next page load:** Previously seen notes should not appear in feed
5. **When filter full:** Old filter is kept, new empty filter is created
6. **After 7 days:** Filters rotate automatically to prevent infinite growth
