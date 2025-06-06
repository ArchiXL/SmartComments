const { ref } = require('vue');
const { applyHighlights, clearAllHighlights } = require('../../directives/highlightDirective.js');

/**
 * Composable for orchestrating the entire highlighting system
 * This handles DOM operations, event management, and integration with stores
 */
function useHighlightOrchestrator(smartCommentsSetup, commentsStore, smartCommentsEvents) {
    const isRefreshing = ref(false);

    /**
     * Get the target element for highlights
     */
    const getTargetElement = () => {
        return document.getElementById('mw-content-text') || document.body;
    };

    /**
     * Handle highlight click events
     */
    const handleHighlightClick = (event, commentData, position) => {
        if (event && event.preventDefault) {
            event.preventDefault();
        }

        // Trigger events
        smartCommentsEvents.triggerHighlightClicked(commentData, position);
        smartCommentsEvents.triggerCommentGroupOpen(commentData, position);

        commentsStore.openCommentDialog(commentData, position);
    };

    /**
     * Reload highlights and update comments store
     */
    const reloadHighlightsAndComments = async () => {
        if (isRefreshing.value) return;

        try {
            isRefreshing.value = true;
            const targetElement = getTargetElement();

            // Clear existing highlights first
            if (smartCommentsSetup.highlightedAnchors?.value) {
                clearAllHighlights(targetElement, smartCommentsSetup.highlightedAnchors.value);
            }

            // Reload comments and highlights from server
            await smartCommentsSetup.loadAndSetHighlights();

            // Update the comments store with the freshly loaded comments
            if (smartCommentsSetup.comments?.value !== undefined) {
                commentsStore.setComments(smartCommentsSetup.comments.value);
            } else {
                console.warn('useHighlightOrchestrator: comments.value is undefined after loadAndSetHighlights, setting empty array');
                commentsStore.setComments([]);
            }

            // Apply the fresh highlights
            if (smartCommentsSetup.highlightedAnchors?.value) {
                applyHighlights(targetElement, smartCommentsSetup.highlightedAnchors.value, handleHighlightClick);
            }

            // Restore active highlight if dialog is open
            if (commentsStore.isCommentDialogVisible && commentsStore.activeComment) {
                const commentId = commentsStore.activeComment.data_id || commentsStore.activeComment.id;
                commentsStore.setActiveHighlight(commentId);
            }
        } catch (error) {
            console.error('useHighlightOrchestrator: Error reloading highlights:', error);
        } finally {
            isRefreshing.value = false;
        }
    };

    /**
     * Clear all highlights
     */
    const clearHighlights = () => {
        const targetElement = getTargetElement();
        if (smartCommentsSetup.highlightedAnchors?.value) {
            clearAllHighlights(targetElement, smartCommentsSetup.highlightedAnchors.value);
        }
    };

    /**
     * Setup highlight refresh event listener
     */
    const setupHighlightRefreshListener = () => {
        const handleHighlightRefresh = async () => {
            await reloadHighlightsAndComments();
        };

        document.addEventListener('smartcomments:refresh-highlights', handleHighlightRefresh);

        return () => {
            document.removeEventListener('smartcomments:refresh-highlights', handleHighlightRefresh);
        };
    };

    /**
     * Manual highlight reload (for debugging)
     */
    const reloadHighlights = async (isEnabled) => {
        if (!isEnabled) {
            console.warn('useHighlightOrchestrator: Cannot reload highlights, system is disabled.');
            return;
        }

        if (!smartCommentsSetup?.loadAndSetHighlights) {
            console.error('useHighlightOrchestrator: smartCommentsSetup.loadAndSetHighlights not available.');
            return;
        }

        try {
            clearHighlights();
            await reloadHighlightsAndComments();
        } catch (error) {
            console.error('useHighlightOrchestrator reloadHighlights: Error:', error);
        }
    };

    return {
        isRefreshing,
        reloadHighlightsAndComments,
        clearHighlights,
        setupHighlightRefreshListener,
        reloadHighlights,
        handleHighlightClick
    };
}

module.exports = useHighlightOrchestrator; 