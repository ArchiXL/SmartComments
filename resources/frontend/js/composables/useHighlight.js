const { ref } = require('vue');

function useHighlight() {
    const highlightedAnchors = ref([]);

    // Function to add a new highlight instruction
    const addHighlight = (type, commentData) => {
        highlightedAnchors.value.push({
            type: type,
            comment: commentData
        });
    };

    // Function to clear a specific highlight (by comment data_id)
    const removeHighlight = (commentId) => {
        highlightedAnchors.value = highlightedAnchors.value.filter(
            h => h.comment.data_id !== commentId
        );
    };

    // Function to clear all highlights
    const clearAllHighlights = () => {
        highlightedAnchors.value = [];
    };

    // Function to set all highlights at once
    const setHighlights = (highlights) => {
        highlightedAnchors.value = highlights;
    };

    return {
        highlightedAnchors,
        addHighlight,
        removeHighlight,
        clearAllHighlights,
        setHighlights
    };
}

module.exports = { useHighlight };