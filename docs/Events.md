# SmartComments Events System

This document describes the centralized event system for SmartComments, which includes events from the previous frontend codebase like `sc-debug-mode`, `sc-comment-group-open`, and new Vue frontend events.

## Overview

The SmartComments Events System provides a centralized way to handle events across the application. It maintains compatibility with the previous frontend codebase while adding new events for the Vue-based frontend.

## Quick Start

```javascript
// Import the events system
const { smartCommentsEvents, EVENTS } = require('./utils/smartCommentsEvents.js');

// Listen for an event
const cleanup = smartCommentsEvents.on(EVENTS.DEBUG_MODE, (event) => {
    console.log('Debug mode changed:', event.detail);
});

// Trigger an event
smartCommentsEvents.triggerCommentGroupOpen(commentData, position);

// Clean up listener when done
cleanup();
```

## Available Events

### Core Events (from previous codebase)

| Event Name | Constant | Description | Event Data |
|------------|----------|-------------|------------|
| `sc-selection-active` | `EVENTS.SELECTION_ACTIVE` | Triggered when user makes a text/content selection | `{ selection, position, timestamp }` |
| `sc-comment-group-open` | `EVENTS.COMMENT_GROUP_OPEN` | Triggered when a comment dialog is opened | `{ comment, position, timestamp }` |
| `sc-comment-group-close` | `EVENTS.COMMENT_GROUP_CLOSE` | Triggered when a comment dialog is closed | `{ timestamp }` |
| `sc-debug-mode` | `EVENTS.DEBUG_MODE` | Triggered when debug mode is enabled/disabled | `{ enabled: boolean }` |
| `sc-open-comment` | `EVENTS.OPEN_COMMENT_ID` | Triggered to open a specific comment by ID | `{ commentId, timestamp }` |

### New Vue Frontend Events

| Event Name | Constant | Description | Event Data |
|------------|----------|-------------|------------|
| `sc-comment-created` | `EVENTS.COMMENT_CREATED` | Triggered when a new comment is created | `{ comment, timestamp }` |
| `sc-comment-updated` | `EVENTS.COMMENT_UPDATED` | Triggered when a comment is updated | `{ comment, timestamp }` |
| `sc-comment-deleted` | `EVENTS.COMMENT_DELETED` | Triggered when a comment is deleted | `{ comment, timestamp }` |
| `sc-comment-completed` | `EVENTS.COMMENT_COMPLETED` | Triggered when a comment is marked as completed | `{ comment, timestamp }` |
| `sc-highlight-clicked` | `EVENTS.HIGHLIGHT_CLICKED` | Triggered when a comment highlight is clicked | `{ comment, position, timestamp }` |
| `sc-selection-changed` | `EVENTS.SELECTION_CHANGED` | Triggered when selection state changes | `{ selection, timestamp }` |
| `sc-comments-enabled` | `EVENTS.COMMENTS_ENABLED` | Triggered when SmartComments is enabled | `{ timestamp }` |
| `sc-comments-disabled` | `EVENTS.COMMENTS_DISABLED` | Triggered when SmartComments is disabled | `{ timestamp }` |

### System Events

| Event Name | Constant | Description | Event Data |
|------------|----------|-------------|------------|
| `smartcomments:refresh-highlights` | `EVENTS.REFRESH_HIGHLIGHTS` | Triggered to refresh comment highlights | `{ timestamp }` |
| `smartcomments:refresh-timeline` | `EVENTS.REFRESH_TIMELINE` | Triggered to refresh comment timeline | `{ timestamp }` |

## Usage Examples

### 1. Listen for Debug Mode Changes

```javascript
const cleanup = smartCommentsEvents.on(EVENTS.DEBUG_MODE, (event) => {
    if (event.detail.enabled) {
        console.log('Debug mode enabled');
        document.body.classList.add('sc-debug');
    } else {
        console.log('Debug mode disabled');
        document.body.classList.remove('sc-debug');
    }
});
```

### 2. Listen for Comment Group Events

```javascript
// Comment opened
smartCommentsEvents.on(EVENTS.COMMENT_GROUP_OPEN, (event) => {
    const { comment, position } = event.detail;
    console.log(`Comment ${comment.id} opened at:`, position);
});

// Comment closed
smartCommentsEvents.on(EVENTS.COMMENT_GROUP_CLOSE, (event) => {
    console.log('Comment dialog closed');
});
```

### 3. Listen for Selection Events

```javascript
smartCommentsEvents.on(EVENTS.SELECTION_ACTIVE, (event) => {
    const { selection, position } = event.detail;
    console.log(`Selected: "${selection.text}"`);
    console.log('Position:', position);
});
```

### 4. Listen for Comment Lifecycle Events

```javascript
// New comment created
smartCommentsEvents.on(EVENTS.COMMENT_CREATED, (event) => {
    console.log('New comment:', event.detail.comment);
    showNotification('Comment created!');
});

// Comment deleted
smartCommentsEvents.on(EVENTS.COMMENT_DELETED, (event) => {
    console.log('Comment deleted:', event.detail.comment);
    showNotification('Comment deleted');
});

// Comment completed
smartCommentsEvents.on(EVENTS.COMMENT_COMPLETED, (event) => {
    console.log('Comment completed:', event.detail.comment);
    showNotification('Comment marked as completed!');
});
```

### 5. Trigger Events Manually

```javascript
// Enable debug mode
smartCommentsEvents.enableDebugMode();

// Open a comment
smartCommentsEvents.triggerCommentGroupOpen(
    { id: 123, text: 'Example comment' },
    { top: 100, left: 200 }
);

// Trigger selection
smartCommentsEvents.triggerSelectionActive({
    selection: { text: 'Selected text', type: 'text' },
    position: { x: 300, y: 400 }
});
```

## Event Object Structure

All events follow this structure:

```javascript
{
    type: 'event-name',           // The event name
    detail: {                     // Event-specific data
        timestamp: 1234567890,    // When the event occurred
        // ... other event-specific properties
    },
    bubbles: true,               // Events bubble up
    cancelable: true             // Events can be cancelled
}
```

## Advanced Usage

### One-time Event Listeners

```javascript
// Listen for an event only once
const cleanup = smartCommentsEvents.once(EVENTS.COMMENT_CREATED, (event) => {
    console.log('First comment created:', event.detail.comment);
});
```

### Debug Mode

```javascript
// Enable debug mode for detailed event logging
smartCommentsEvents.enableDebugMode();

// Disable debug mode
smartCommentsEvents.disableDebugMode();

// Debug mode is automatically enabled if URL contains scenabled=1
```

### Custom Event Targets

```javascript
// Listen on a specific element instead of window
const element = document.getElementById('my-element');
const cleanup = smartCommentsEvents.on(EVENTS.DEBUG_MODE, callback, element);
```

### Clean Up All Listeners

```javascript
// Remove all event listeners (useful for cleanup)
smartCommentsEvents.removeAllListeners();
```

## Legacy Compatibility

The events system provides automatic compatibility with jQuery events if jQuery is available:

```javascript
// If jQuery is present, events are also triggered as jQuery events
$(window).on('sc-debug-mode', function(event, data) {
    console.log('jQuery event received:', data);
});
```

## URL Parameter Integration

Debug mode is automatically enabled when the URL contains `scenabled=1`:

```
https://example.com/wiki/Page?scenabled=1
```

This will automatically trigger the `sc-debug-mode` event with `enabled: true`.

## Best Practices

1. **Always clean up listeners** when components are destroyed:
   ```javascript
   const cleanup = smartCommentsEvents.on(EVENTS.DEBUG_MODE, callback);
   
   // In Vue component beforeUnmount or similar
   cleanup();
   ```

2. **Use constants instead of strings** for event names:
   ```javascript
   // Good
   smartCommentsEvents.on(EVENTS.DEBUG_MODE, callback);
   
   // Avoid
   smartCommentsEvents.on('sc-debug-mode', callback);
   ```

3. **Check event data structure** before using:
   ```javascript
   smartCommentsEvents.on(EVENTS.COMMENT_CREATED, (event) => {
       if (event.detail && event.detail.comment) {
           console.log('Comment:', event.detail.comment);
       }
   });
   ```

4. **Use debug mode for development**:
   ```javascript
   // Add ?scenabled=1 to URL for automatic debug mode
   // Or enable manually:
   smartCommentsEvents.enableDebugMode();
   ```

## Integration with Vue Components

In Vue components, set up event listeners in `mounted()` and clean them up in `beforeUnmount()`:

```javascript
// In Vue component
mounted() {
    this.eventCleanups = [
        smartCommentsEvents.on(EVENTS.DEBUG_MODE, this.handleDebugMode),
        smartCommentsEvents.on(EVENTS.COMMENT_CREATED, this.handleCommentCreated),
    ];
},

beforeUnmount() {
    this.eventCleanups.forEach(cleanup => cleanup());
},

methods: {
    handleDebugMode(event) {
        // Handle debug mode change
    },
    
    handleCommentCreated(event) {
        // Handle comment creation
    }
}
```

## Files

- **`smartCommentsEvents.js`** - Main events system implementation
- **`eventsExample.js`** - Usage examples and demos
- **`SmartComments.vue`** - Main Vue component with events integration
- **`commentsStore.js`** - Pinia store with events integration

## See Also

- **`examples/eventsExample.js`** - Complete usage examples
- Original events system: **`resources/js/sic-base/events/Events.js`** 