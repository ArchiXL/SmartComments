# SmartComments Events System

This document describes the jQuery-based event system for SmartComments, using `$(window).on()` for event handling across the application.

## Overview

The SmartComments Events System uses jQuery's event system with `$(window).on()` to handle events across the application. All events are triggered on the window object for global accessibility.

## Quick Start

```javascript
// Listen for an event
$(window).on('sc-debug-mode', function(event, data) {
    console.log('Debug mode changed:', data);
});

// Trigger an event
$(window).trigger('sc-comment-group-open', {
    comment: commentData,
    position: position,
    timestamp: Date.now()
});
```

## Available Events

### Core Events

| Event Name | Description | Event Data |
|------------|-------------|------------|
| `sc-selection-active` | Triggered when user makes a text/content selection | `{ selection, position, timestamp }` |
| `sc-comment-group-open` | Triggered when a comment dialog is opened | `{ comment, position, timestamp }` |
| `sc-comment-group-close` | Triggered when a comment dialog is closed | `{ timestamp }` |
| `sc-debug-mode` | Triggered when debug mode is enabled/disabled | `{ enabled: boolean }` |
| `sc-open-comment` | Triggered to open a specific comment by ID | `{ commentId, timestamp }` |

### Comment Lifecycle Events

| Event Name | Description | Event Data |
|------------|-------------|------------|
| `sc-comment-created` | Triggered when a new comment is created | `{ comment, timestamp }` |
| `sc-comment-updated` | Triggered when a comment is updated | `{ comment, timestamp }` |
| `sc-comment-deleted` | Triggered when a comment is deleted | `{ comment, timestamp }` |
| `sc-comment-completed` | Triggered when a comment is marked as completed | `{ comment, timestamp }` |

### UI Events

| Event Name | Description | Event Data |
|------------|-------------|------------|
| `sc-highlight-clicked` | Triggered when a comment highlight is clicked | `{ comment, position, timestamp }` |
| `sc-selection-changed` | Triggered when selection state changes | `{ selection, timestamp }` |
| `sc-comments-enabled` | Triggered when SmartComments is enabled | `{ timestamp }` |
| `sc-comments-disabled` | Triggered when SmartComments is disabled | `{ timestamp }` |

### System Events

| Event Name | Description | Event Data |
|------------|-------------|------------|
| `smartcomments:refresh-highlights` | Triggered to refresh comment highlights | `{ timestamp }` |
| `smartcomments:refresh-timeline` | Triggered to refresh comment timeline | `{ timestamp }` |

## Usage Examples

### 1. Listen for Debug Mode Changes

```javascript
$(window).on('sc-debug-mode', function(event, data) {
    if (data.enabled) {
        console.log('Debug mode enabled');
        $('body').addClass('sc-debug');
    } else {
        console.log('Debug mode disabled');
        $('body').removeClass('sc-debug');
    }
});
```

### 2. Listen for Comment Group Events

```javascript
// Comment opened
$(window).on('sc-comment-group-open', function(event, data) {
    var comment = data.comment;
    var position = data.position;
    console.log('Comment ' + comment.id + ' opened at:', position);
});

// Comment closed
$(window).on('sc-comment-group-close', function(event, data) {
    console.log('Comment dialog closed');
});
```

### 3. Listen for Selection Events

```javascript
$(window).on('sc-selection-active', function(event, data) {
    var selection = data.selection;
    var position = data.position;
    console.log('Selected: "' + selection.text + '"');
    console.log('Position:', position);
});
```

### 4. Listen for Comment Lifecycle Events

```javascript
// New comment created
$(window).on('sc-comment-created', function(event, data) {
    console.log('New comment:', data.comment);
    showNotification('Comment created!');
});

// Comment deleted
$(window).on('sc-comment-deleted', function(event, data) {
    console.log('Comment deleted:', data.comment);
    showNotification('Comment deleted');
});

// Comment completed
$(window).on('sc-comment-completed', function(event, data) {
    console.log('Comment completed:', data.comment);
    showNotification('Comment marked as completed!');
});
```

### 5. Trigger Events

```javascript
// Enable debug mode
$(window).trigger('sc-debug-mode', { enabled: true });

// Open a comment
$(window).trigger('sc-comment-group-open', {
    comment: { id: 123, text: 'Example comment' },
    position: { top: 100, left: 200 },
    timestamp: Date.now()
});

// Trigger selection
$(window).trigger('sc-selection-active', {
    selection: { text: 'Selected text', type: 'text' },
    position: { x: 300, y: 400 },
    timestamp: Date.now()
});
```

## Event Data Structure

All events include a timestamp and event-specific data:

```javascript
{
    timestamp: 1234567890,    // When the event occurred
    // ... other event-specific properties
}
```

## Advanced Usage

### One-time Event Listeners

```javascript
// Listen for an event only once
$(window).one('sc-comment-created', function(event, data) {
    console.log('First comment created:', data.comment);
});
```

### Namespaced Events

```javascript
// Use namespaces for easier cleanup
$(window).on('sc-debug-mode.myPlugin', function(event, data) {
    console.log('Debug mode changed:', data);
});

// Remove all events for a namespace
$(window).off('.myPlugin');
```

### Event Delegation

```javascript
// Listen for events on specific elements
$(document).on('sc-highlight-clicked', '.comment-highlight', function(event, data) {
    console.log('Highlight clicked:', data);
});
```

## URL Parameter Integration

Debug mode is automatically enabled when the URL contains `scenabled=1`:

```
https://example.com/wiki/Page?scenabled=1
```

This will automatically trigger the `sc-debug-mode` event:

```javascript
// Check URL parameter on page load
$(document).ready(function() {
    var urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('scenabled') === '1') {
        $(window).trigger('sc-debug-mode', { enabled: true });
    }
});
```

## Best Practices

1. **Always clean up event listeners** when components are destroyed:
   ```javascript
   // Use namespaces for easy cleanup
   $(window).on('sc-debug-mode.myComponent', callback);
   
   // Later, remove all events for this component
   $(window).off('.myComponent');
   ```

2. **Use consistent event naming**:
   ```javascript
   // Follow the sc-* pattern for SmartComments events
   $(window).trigger('sc-comment-created', data);
   ```

3. **Include timestamps in event data**:
   ```javascript
   $(window).trigger('sc-comment-created', {
       comment: comment,
       timestamp: Date.now()
   });
   ```

4. **Check for jQuery availability**:
   ```javascript
   if (typeof $ !== 'undefined') {
       $(window).on('sc-debug-mode', callback);
   }
   ```

## Event Triggering Utilities

Create helper functions for common event triggers:

```javascript
// Helper functions for triggering events
var SmartCommentsEvents = {
    enableDebugMode: function() {
        $(window).trigger('sc-debug-mode', { enabled: true });
    },
    
    disableDebugMode: function() {
        $(window).trigger('sc-debug-mode', { enabled: false });
    },
    
    openComment: function(comment, position) {
        $(window).trigger('sc-comment-group-open', {
            comment: comment,
            position: position,
            timestamp: Date.now()
        });
    },
    
    closeComment: function() {
        $(window).trigger('sc-comment-group-close', {
            timestamp: Date.now()
        });
    },
    
    commentCreated: function(comment) {
        $(window).trigger('sc-comment-created', {
            comment: comment,
            timestamp: Date.now()
        });
    }
};

// Usage
SmartCommentsEvents.enableDebugMode();
SmartCommentsEvents.openComment(commentData, { top: 100, left: 200 });
```

## Integration Examples

### MediaWiki Integration

```javascript
// In MediaWiki, use mw.hook for additional compatibility
$(document).ready(function() {
    // Listen for SmartComments events
    $(window).on('sc-comment-created', function(event, data) {
        // Also fire MediaWiki hook
        mw.hook('smartcomments.comment.created').fire(data.comment);
    });
});
```

### Debug Console Integration

```javascript
// Enable debug logging for all SmartComments events
$(window).on('sc-debug-mode', function(event, data) {
    if (data.enabled) {
        // Log all SmartComments events when debug is enabled
        $(window).on('sc-comment-created.debug sc-comment-deleted.debug sc-comment-updated.debug', 
            function(event, data) {
                console.log('SmartComments Event:', event.type, data);
            }
        );
    } else {
        // Remove debug logging
        $(window).off('.debug');
    }
});
```

## Files

Events are handled throughout the SmartComments codebase using this jQuery-based approach in various JavaScript files within the extension. 