const { onMounted, ref } = require('vue');
const useComments = require('./useComments.js');
const { useHighlight } = require('./useHighlight.js');

/**
 * @typedef {import('./useComments.js').Comment} Comment
 */

/**
 * Formats comments for the highlighting directive/component.
 * @param {Array<Comment>} commentsArray - Array of comments from useComments.
 * @returns {Array<Object|null>} Array of formatted highlight objects.
 */
function formatCommentsForHighlighting(commentsArray) {
    return commentsArray.map(comment => {
        let pos;

        // Ensure comment object and its properties are valid before accessing
        if (comment && comment.highlight_type) {
            if (comment.highlight_type === 'wordIndex' || comment.highlight_type === 'findSelectionIndex') {
                // Expects pos to be in "text_to_find|occurrence_index" format directly from useComments
                pos = comment.pos;
            } else if (comment.highlight_type === 'jQuery') {
                if (comment.selector) {
                    pos = comment.selector;
                } else if (comment.posimg) {
                    // Construct an image selector based on posimg
                    // This might need adjustment based on how images are uniquely identified in your HTML.
                    // For example, if posimg is a hash: `img[data-image-hash='${comment.posimg}']`
                    // If posimg is part of the src: `img[src*='${comment.posimg}']`
                    pos = `img[src*='${comment.posimg}']`; // Assuming posimg is part of the src URL
                }
            }
        }

        // Ensure comment object, data_id, and a valid pos are present
        if (comment && comment.data_id && typeof pos !== 'undefined') {
            return {
                type: comment.highlight_type,
                comment: {
                    pos: comment.pos,
                    data_id: comment.data_id,
                    rawComment: comment // Include the full comment object
                }
            };
        }
        return null; // Return null for invalid or incomplete comments to filter them out
    }).filter(highlight => highlight !== null); // Filter out any null values
}

/**
 * Composable for setting up smart comments functionality.
 * Orchestrates fetching comments and preparing them for highlighting.
 * @returns {Object} State and functions for smart comments.
 */
function useSmartCommentsSetup() {
    const { comments, fetchComments, isLoading, error } = useComments();
    const { highlightedAnchors, setHighlights } = useHighlight();

    const loadAndSetHighlights = async () => {
        await fetchComments(); // Fetch comments using useComments
        const formattedHighlights = formatCommentsForHighlighting(comments.value);
        setHighlights(formattedHighlights);
    };

    onMounted(() => {
        console.log('SmartComments setup initiated from useSmartCommentsSetup');
        // Check if scenabled=1 is in the URL to enable features
        if (window.location.href.indexOf('scenabled=1') !== -1) {
            loadAndSetHighlights();
        }
    });

    return {
        highlightedAnchors, // from useHighlight, to be consumed by the directive
        isLoading,          // from useComments
        error,              // from useComments
        // comments,        // raw comments, if needed by the component directly
        // loadAndSetHighlights // if manual refresh is needed
    };
}

module.exports = useSmartCommentsSetup; 