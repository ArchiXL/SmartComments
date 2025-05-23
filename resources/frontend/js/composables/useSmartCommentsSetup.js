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
    console.log('formatCommentsForHighlighting called with:', commentsArray);

    return commentsArray.map((comment, index) => {
        console.log(`Processing comment ${index}:`, comment);
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
                } else {
                    // For jQuery type, use comment.pos directly if no selector/posimg
                    pos = comment.pos;
                }
            }
        } else if (comment && comment.pos) {
            // If no highlight_type is set but pos exists, try to determine the type
            console.warn(`Comment ${index} has no highlight_type but has pos:`, comment.pos, 'Attempting to determine type...');

            if (comment.pos.includes('|')) {
                comment.highlight_type = 'wordIndex';
                pos = comment.pos;
            } else if (comment.pos.includes('[') && comment.pos.includes(']')) {
                comment.highlight_type = 'jQuery';
                pos = comment.pos;
            } else if (comment.pos.includes('img[')) {
                comment.highlight_type = 'jQuery';
                pos = comment.pos;
            } else {
                // Default to wordIndex for text-based positions
                comment.highlight_type = 'wordIndex';
                pos = comment.pos;
            }

            console.log(`Determined highlight_type: ${comment.highlight_type} for comment ${index}`);
        }

        // Ensure comment object, data_id, and a valid pos are present
        if (comment && comment.data_id && typeof pos !== 'undefined') {
            const highlightObj = {
                type: comment.highlight_type,
                comment: {
                    pos: comment.pos,
                    data_id: comment.data_id,
                    rawComment: comment // Include the full comment object
                }
            };
            console.log(`Created highlight object for comment ${index}:`, highlightObj);
            return highlightObj;
        } else {
            console.warn(`Filtering out comment ${index} - missing required fields:`, {
                hasComment: !!comment,
                hasDataId: !!(comment && comment.data_id),
                hasPos: typeof pos !== 'undefined',
                comment: comment
            });
            return null; // Return null for invalid or incomplete comments to filter them out
        }
    }).filter(highlight => {
        const isValid = highlight !== null;
        if (!isValid) {
            console.log('Filtered out null highlight');
        }
        return isValid;
    }); // Filter out any null values
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

    console.log('useSmartCommentsSetup initialized - isLoading:', isLoading, 'error:', error);

    const loadAndSetHighlights = async () => {
        console.log('loadAndSetHighlights called - starting fetch...');
        try {
            await fetchComments(); // Fetch comments using useComments
            console.log('Comments fetched:', comments.value);

            const formattedHighlights = formatCommentsForHighlighting(comments.value);
            console.log('Formatted highlights:', formattedHighlights);

            setHighlights(formattedHighlights);
            console.log('Highlights set. Current highlightedAnchors:', highlightedAnchors.value);
        } catch (err) {
            console.error('Error in loadAndSetHighlights:', err);
        }
    };

    onMounted(async () => {
        console.log('SmartComments setup onMounted - checking if enabled...');
        // Check if scenabled=1 is in the URL to enable features
        if (window.location.href.indexOf('scenabled=1') !== -1) {
            console.log('SmartComments enabled - loading highlights...');
            await loadAndSetHighlights();
        } else {
            console.log('SmartComments not enabled (missing scenabled=1 in URL)');
        }
    });

    return {
        highlightedAnchors, // from useHighlight, to be consumed by the directive
        isLoading,          // from useComments
        error,              // from useComments
        comments,           // Expose comments for debugging
        loadAndSetHighlights // Expose manual refresh capability
    };
}

module.exports = useSmartCommentsSetup; 