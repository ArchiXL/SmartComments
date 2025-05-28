const { onMounted, ref } = require('vue');
const useComments = require('./useComments.js');
const { useHighlight } = require('./useHighlight.js');
const useAppStateStore = require('../store/appStateStore.js');

/**
 * @typedef {import('./useComments.js').Comment} Comment
 */

/**
 * Formats comments for the highlighting directive/component.
 * @param {Array<Comment>} commentsArray - Array of comments from useComments.
 * @returns {Array<Object|null>} Array of formatted highlight objects.
 */
function formatCommentsForHighlighting(commentsArray) {
    if (!Array.isArray(commentsArray)) {
        console.error('formatCommentsForHighlighting: input is not an array', commentsArray);
        return [];
    }

    return commentsArray.map((comment) => {
        let highlightPos;

        // comment object structure from useComments.fetchComments now includes:
        // - highlight_type: 'wordIndex', 'selector', or 'unknown' (filtered out by useComments)
        // - parsedSelection: { text, index, type, position (original pos string) }
        // - data_id: the comment ID
        // - pos: the original position string from backend

        if (!comment || !comment.data_id || !comment.highlight_type || !comment.parsedSelection) {
            console.warn('Filtering out comment due to missing essential fields:', comment);
            return null;
        }

        if (comment.highlight_type === 'wordIndex') {
            // For wordIndex, the highlight directive expects the original "text|index" string.
            // This is available in comment.pos or comment.parsedSelection.position.
            highlightPos = comment.pos;
        } else if (comment.highlight_type === 'selector') {
            // For selector type (images, dynamic blocks), the 'text' field of parsedSelection is the selector string.
            highlightPos = comment.parsedSelection.text;
        } else {
            console.warn(`Unknown highlight_type '${comment.highlight_type}' for comment:`, comment);
            return null; // Filter out if type is not recognized for highlighting
        }

        if (typeof highlightPos === 'undefined' || highlightPos === null || highlightPos === '') {
            console.warn('Filtering out comment due to undefined or empty highlight position string:', comment);
            return null;
        }

        return {
            type: comment.highlight_type, // 'wordIndex' or 'selector'
            comment: {
                pos: highlightPos, // The string the highlighter will use
                data_id: comment.data_id,
                rawComment: comment // Keep the full comment object for context if needed by the click handler
            }
        };
    }).filter(highlight => highlight !== null); // Filter out any null values from mapping
}

/**
 * Composable for setting up smart comments functionality.
 * Orchestrates fetching comments and preparing them for highlighting.
 * @returns {Object} State and functions for smart comments.
 */
function useSmartCommentsSetup() {
    const commentsComposable = useComments();
    const highlightComposable = useHighlight();

    // Destructure with fallbacks
    const {
        comments = ref([]),
        fetchComments = () => { },
        isLoading = ref(false),
        error = ref(null)
    } = commentsComposable || {};

    const {
        highlightedAnchors = ref([]),
        setHighlights = () => { }
    } = highlightComposable || {};

    const loadAndSetHighlights = async () => {
        try {
            await fetchComments(); // Fetch comments using useComments

            const formattedHighlights = formatCommentsForHighlighting(comments.value);

            setHighlights(formattedHighlights);
        } catch (err) {
            console.error('Error in loadAndSetHighlights:', err);
        }
    };

    return {
        highlightedAnchors,
        isLoading,
        error,
        comments,
        loadAndSetHighlights
    };
}

module.exports = useSmartCommentsSetup; 