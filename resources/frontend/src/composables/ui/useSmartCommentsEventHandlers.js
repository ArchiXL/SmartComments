/**
 * Composable for managing SmartComments event handlers
 */
function useSmartCommentsEventHandlers(smartCommentsEvents, EVENTS, store, commentsStore, highlightsManager) {
    /**
     * Setup SmartComments events
     */
    const setupSmartCommentsEvents = () => {
        const cleanupFunctions = [];

        // Listen for debug mode events
        cleanupFunctions.push(
            smartCommentsEvents.on(EVENTS.DEBUG_MODE, (event) => {
                if (event.detail.enabled && !store.isEnabled) {
                    store.setEnabled(true);
                }
            })
        );

        // Listen for selection active events
        cleanupFunctions.push(
            smartCommentsEvents.on(EVENTS.SELECTION_ACTIVE, (event) => {
                // Close any open comment dialogs when a new selection is made
                if (commentsStore.isCommentDialogVisible) {
                    commentsStore.closeCommentDialog();
                }
            })
        );

        // Listen for open comment events
        cleanupFunctions.push(
            smartCommentsEvents.on(EVENTS.OPEN_COMMENT_ID, (event) => {
                if (event.detail.commentId) {
                    // Handle opening specific comment
                    commentsStore.openCommentById(event.detail.commentId);
                }
            })
        );

        // Listen for comment created events
        cleanupFunctions.push(
            smartCommentsEvents.on(EVENTS.COMMENT_CREATED, (event) => {
                if (highlightsManager) {
                    highlightsManager.reloadHighlightsAndComments();
                }
            })
        );

        return () => {
            cleanupFunctions.forEach(cleanup => cleanup());
        };
    };

    return {
        setupSmartCommentsEvents
    };
}

export default useSmartCommentsEventHandlers; 