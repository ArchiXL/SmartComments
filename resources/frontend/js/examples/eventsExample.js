/**
 * SmartComments Events System Usage Example
 * 
 * This example demonstrates how to use the events from the previous frontend codebase
 * like sc-debug-mode, sc-comment-group-open, etc.
 */

// Import the events system
const { smartCommentsEvents, EVENTS } = require('../utils/smartCommentsEvents.js');

/**
 * Example 1: Listen for debug mode events
 */
function setupDebugModeListener() {
    const cleanup = smartCommentsEvents.on(EVENTS.DEBUG_MODE, (event) => {
        if (event.detail.enabled) {
            // Add debug UI elements, logging, etc.
            document.body.classList.add('sc-debug');
        } else {
            document.body.classList.remove('sc-debug');
        }
    });

    return cleanup; // Call this to remove the listener
}

/**
 * Example 2: Listen for comment group open/close events
 */
function setupCommentGroupListeners() {
    const openCleanup = smartCommentsEvents.on(EVENTS.COMMENT_GROUP_OPEN, (event) => {
        const { comment, position, timestamp } = event.detail;
        document.body.classList.add('sc-comment-open');
    });

    const closeCleanup = smartCommentsEvents.on(EVENTS.COMMENT_GROUP_CLOSE, (event) => {
        document.body.classList.remove('sc-comment-open');
    });

    return [openCleanup, closeCleanup];
}

/**
 * Example 3: Listen for selection events
 */
function setupSelectionListener() {
    const cleanup = smartCommentsEvents.on(EVENTS.SELECTION_ACTIVE, (event) => {
        const { selection, position } = event.detail;
        // You could show a temporary UI indicator
        showSelectionFeedback(selection, position);
    });

    return cleanup;
}

/**
 * Example 4: Listen for comment lifecycle events
 */
function setupCommentLifecycleListeners() {
    const createdCleanup = smartCommentsEvents.on(EVENTS.COMMENT_CREATED, (event) => {
        showNotification('Comment created successfully!', 'success');
    });

    const deletedCleanup = smartCommentsEvents.on(EVENTS.COMMENT_DELETED, (event) => {
        showNotification('Comment deleted.', 'info');
    });

    const completedCleanup = smartCommentsEvents.on(EVENTS.COMMENT_COMPLETED, (event) => {
        showNotification('Comment marked as completed!', 'success');
    });

    return [createdCleanup, deletedCleanup, completedCleanup];
}

/**
 * Example 5: Trigger events manually
 */
function triggerExampleEvents() {
    // Enable debug mode
    smartCommentsEvents.enableDebugMode();

    // Trigger a comment open event
    smartCommentsEvents.triggerCommentGroupOpen(
        { id: 123, text: 'Example comment' },
        { top: 100, left: 200 }
    );

    // Trigger a selection event
    smartCommentsEvents.triggerSelectionActive({
        selection: { text: 'Selected text example', type: 'text' },
        position: { x: 300, y: 400 }
    });

    // Trigger comment close
    setTimeout(() => {
        smartCommentsEvents.triggerCommentGroupClose();
    }, 2000);
}

/**
 * Example 6: URL parameter detection for debug mode
 * This automatically enables debug mode if scenabled=1 is in the URL
 */
function checkUrlForDebugMode() {
    // This is automatically done by the events system constructor,
    // but you can also check manually:
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('scenabled') === '1') {
        smartCommentsEvents.enableDebugMode();
    }
}

/**
 * Helper function to show selection feedback
 */
function showSelectionFeedback(selection, position) {
    const feedback = document.createElement('div');
    feedback.style.position = 'absolute';
    feedback.style.left = position.x + 'px';
    feedback.style.top = position.y + 'px';
    feedback.style.background = 'rgba(255, 255, 0, 0.8)';
    feedback.style.padding = '5px';
    feedback.style.borderRadius = '3px';
    feedback.style.zIndex = '9999';
    feedback.style.pointerEvents = 'none';
    feedback.textContent = `Selected: ${selection.text.substring(0, 50)}...`;

    document.body.appendChild(feedback);

    // Remove after 2 seconds
    setTimeout(() => {
        if (feedback.parentNode) {
            feedback.parentNode.removeChild(feedback);
        }
    }, 2000);
}

/**
 * Helper function to show notifications
 */
function showNotification(message, type = 'info') {
    // Use MediaWiki notification system if available
    if (typeof mw !== 'undefined' && mw.notify) {
        mw.notify(message, { type });
    }
}

/**
 * Example usage - Setup all listeners
 */
function initializeEventListeners() {
    const cleanupFunctions = [
        setupDebugModeListener(),
        ...setupCommentGroupListeners(),
        setupSelectionListener(),
        ...setupCommentLifecycleListeners()
    ];

    // Return a function to clean up all listeners
    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
}

// Example of using the events system
if (typeof window !== 'undefined') {
    // Initialize listeners when the page loads
    document.addEventListener('DOMContentLoaded', () => {
        const cleanup = initializeEventListeners();

        // Store cleanup function globally for debugging
        window.smartCommentsCleanup = cleanup;

        // For testing, you can trigger example events
        // Uncomment the next line to see the events in action:
        // setTimeout(triggerExampleEvents, 1000);
    });
}

module.exports = {
    setupDebugModeListener,
    setupCommentGroupListeners,
    setupSelectionListener,
    setupCommentLifecycleListeners,
    triggerExampleEvents,
    initializeEventListeners
}; 