# Bloom Filter Debug Guide

## Overview
The bloom filter implementation has been converted from relay-based to localStorage-only. This guide helps debug why notes might not be getting filtered.

## Changes Made

1. **Removed all relay-related code** from `SeenNotesManager`
2. **Added localStorage persistence** with user-specific keys
3. **Added comprehensive logging** to all filter operations
4. **Added debug helper functions** available in browser console
5. **Fixed intersection observer** to properly track new notes with MutationObserver
6. **Added different timeouts** for intersection observer (5s) vs mouse hover (1s)
7. **Added sidebar exclusions** to prevent trending sidebar notes from being marked as seen

## How to Debug

### 1. Open Browser Console
Open the developer tools in your browser and check the console for log messages.

### 2. Look for These Log Messages

**Initialization:**
- `SeenNotesManager: Initialized for pubkey [pubkey]`
- `SeenNotesManager: Starting initialization`
- `FeedIntegration: Account available, pubkey: [pubkey]`
- `FeedIntegration: Manager initialized successfully`

**Intersection Observer Setup:**
- `NoteVisibilityTracker: Creating intersection observer`
- `NoteVisibilityTracker: Found X existing note elements to observe`
- `NoteVisibilityTracker: Mutation observer set up to watch for new notes`
- `NoteVisibilityTracker: New note element added to DOM: [noteId]`

**Filter Operations:**
- `SeenNotesIntegration: Effect triggered with X notes`
- `FeedIntegration: filterSeenNotes called with X notes`
- `SeenNotesManager: Checking if note "[noteId]" should be shown`
- `BloomFilter: Item "[noteId]" NOT FOUND in filter` (note will be shown)
- `BloomFilter: Item "[noteId]" FOUND in filter` (note will be hidden)

**Note Tracking - Intersection Observer (5 second timeout):**
- `NoteVisibilityTracker: Note [noteId] is now VISIBLE via intersection observer`
- `SeenNotesManager: Note "[noteId]" came into view via intersection observer - starting 5000ms timer`
- `SeenNotesManager: intersection observer timeout (5000ms) expired for note "[noteId]" - marking as seen`

**Note Tracking - Mouse Hover (1 second timeout):**
- `SeenNotesIntegration: Mouse entered note [noteId]`
- `SeenNotesManager: Note "[noteId]" came into view via mouse hover - starting 1000ms timer`
- `SeenNotesManager: mouse hover timeout (1000ms) expired for note "[noteId]" - marking as seen`

**Sidebar Exclusions:**
- `🔒 Skipping sidebar element with noteId: [noteId]` (sidebar notes are not tracked)

**Bloom Filter Operations:**
- `BloomFilter: Adding item "[noteId]" to filter`
- `BloomFilter: Item "[noteId]" successfully added to filter`

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

### Issue 2: Intersection observer not working
**Problem:** No intersection observer logs appearing when scrolling
**Check:** Look for "NoteVisibilityTracker: Creating intersection observer" and "data-note-id" attributes on note elements
**Solution:** 
- Verify `data-note-id` attributes are present on note wrapper elements
- Check that MutationObserver is detecting new notes: look for "New note element added to DOM" logs
- Ensure feed container selector is correct (`.homeFeed`)

### Issue 3: Only mouse hover working
**Problem:** Notes only marked as seen when hovering, not when scrolling
**Check:** Look for intersection observer vs mouse hover logs
**Solution:** 
- Verify intersection observer is being created successfully
- Check that note elements have proper `data-note-id` attributes
- Ensure threshold (50% visibility) is being met

### Issue 4: Notes being tracked but not saved
**Problem:** localStorage operations failing
**Check:** Look for "Saved seen notes filters to localStorage" logs
**Solution:** Check browser's localStorage quota and permissions

### Issue 5: Notes not being filtered after being marked as seen
**Problem:** Filter exists but `shouldShowNote` always returns true
**Check:** Look for "BloomFilter: Item X FOUND/NOT FOUND" logs
**Solution:** Verify bloom filter is being populated correctly

## Test Scenarios

### Test 1: Fresh Start
1. Clear all filters: `window.debugSeenNotes.clearAll()`
2. Refresh page
3. Verify initialization logs appear
4. Scroll through notes and look for intersection observer logs

### Test 2: Mouse vs Intersection Observer
1. Hover over a note quickly (should see 1s timeout)
2. Scroll slowly to keep a note in view (should see 5s timeout)
3. Verify different timeout values in logs

### Test 3: Dynamic Note Loading
1. Scroll to load more notes
2. Look for "New note element added to DOM" logs
3. Verify new notes are being observed automatically

### Test 4: Filter Rotation
1. Scroll through many notes to fill up the filter
2. Look for "Rotating bloom filters" logs when capacity is reached
3. Verify old filter is preserved and new filter is created

### Test 5: Persistence
1. Mark several notes as seen
2. Refresh the page
3. Verify filters are loaded from localStorage
4. Check that previously seen notes don't appear

## Configuration

Current settings:
- **Intersection observer timeout:** 5 seconds (sustained viewing)
- **Mouse hover timeout:** 1 second (quick interaction)
- **Filter rotation:** Every 7 days or when 99% full
- **Intersection threshold:** 50% of note must be visible
- **Save interval:** 5 seconds between localStorage saves

## Expected Behavior

1. **On page load:** 
   - Filters load from localStorage for current user
   - Intersection observer is created and starts watching existing notes
   - MutationObserver starts watching for new notes

2. **When scrolling:** 
   - Notes become "in view" and start 5-second timers via intersection observer
   - New notes are automatically detected and observed

3. **When hovering:** 
   - Notes start 1-second timers via mouse events
   - Faster feedback for quick interactions

4. **After timeouts expire:** 
   - Notes are marked as seen and added to bloom filter
   - Different timeouts for different interaction types

5. **On next page load:** 
   - Previously seen notes should not appear in feed

6. **When filter full:** 
   - Old filter is kept, new empty filter is created

7. **After 7 days:** 
   - Filters rotate automatically to prevent infinite growth
