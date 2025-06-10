import { ref } from 'vue';
import { errorHandler } from './shared/HighlightErrorHandler.js';
import { sanitizeCommentId } from './shared/HighlightUtils.js';

/**
 * Composable for managing highlight data structures and CRUD operations
 * This handles the reactive highlight data array and provides validation
 */
export function useHighlightData() {
    const highlightedAnchors = ref([]);

    // Function to add a new highlight instruction
    const addHighlight = (type, commentData) => {
        try {
            // Basic validation for type
            if (!type || typeof type !== 'string') {
                errorHandler.handleValidationError('Highlight type must be a valid string', { type, commentData });
                return;
            }

            // Basic validation for commentData
            if (!commentData || typeof commentData !== 'object') {
                errorHandler.handleValidationError('Comment data must be a valid object', { type, commentData });
                return;
            }

            // For temporary highlights during selection, we don't need full validation
            // Only validate data_id if it exists (for saved highlights)
            if (commentData.data_id !== undefined && commentData.data_id !== null) {
                try {
                    sanitizeCommentId(commentData.data_id);
                } catch (error) {
                    errorHandler.handleValidationError('Invalid comment ID', { type, commentData }, error);
                    return;
                }
            }

            // Add the highlight to the array
            highlightedAnchors.value.push({
                type: type,
                comment: commentData
            });
        } catch (error) {
            // Log error but don't throw - this allows the selection process to continue
            errorHandler.handleDOMError('Failed to add highlight', { type, commentData }, error);
        }
    };

    // Function to clear a specific highlight (by comment data_id)
    const removeHighlight = (commentId) => {
        try {
            const sanitizedId = sanitizeCommentId(commentId);
            highlightedAnchors.value = highlightedAnchors.value.filter(
                h => h.comment.data_id !== sanitizedId
            );
        } catch (error) {
            errorHandler.handleDOMError('Failed to remove highlight', { commentId }, error);
        }
    };

    // Function to clear all highlights
    const clearAllHighlights = () => {
        highlightedAnchors.value = [];
    };

    // Function to set all highlights at once (for loaded highlights)
    const setHighlights = (highlights) => {
        if (!Array.isArray(highlights)) {
            errorHandler.handleValidationError('Highlights must be an array', { highlights });
            return;
        }

        try {
            // Only validate existing highlights that should have complete data
            const validatedHighlights = highlights.filter(highlight => {
                try {
                    // Only do full validation for highlights that appear to be complete
                    if (highlight.comment && highlight.comment.data_id) {
                        errorHandler.validateHighlightData(highlight);
                    }
                    return true;
                } catch (error) {
                    errorHandler.handleDOMError('Skipping invalid highlight during setHighlights', { highlight }, error);
                    return false;
                }
            });

            highlightedAnchors.value = validatedHighlights;
        } catch (error) {
            errorHandler.handleDOMError('Failed to set highlights', { highlights }, error);
        }
    };

    return {
        highlightedAnchors,
        addHighlight,
        removeHighlight,
        clearAllHighlights,
        setHighlights
    };
}