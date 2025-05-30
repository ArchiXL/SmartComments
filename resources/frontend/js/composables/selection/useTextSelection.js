const {
    initializeRangy,
    validateSelectionContent,
    getMediaWikiContentRoot,
    isSelectionEnabled
} = require('../../utils/selectionUtils.js');
const { SELECTION_ENUMS, SMARTCOMMENTS_CLASSES } = require('../../utils/constants.js');
const useScreenshot = require('../useScreenshot.js');

function useTextSelection() {
    // Initialize rangy on first use
    let rangyInitialized = false;
    let highlighter = null;
    const TEMP_HIGHLIGHT_CLASS = SMARTCOMMENTS_CLASSES.HIGHLIGHT_TEMP;

    // Screenshot composable instance
    const { screenshotSelectionArea } = useScreenshot();

    /**
     * Ensures rangy is initialized
     */
    function ensureRangyInitialized() {
        if (!rangyInitialized) {
            rangyInitialized = initializeRangy();
            if (rangyInitialized && rangy.createHighlighter) {
                highlighter = rangy.createHighlighter();
                highlighter.addClassApplier(rangy.createClassApplier(TEMP_HIGHLIGHT_CLASS));
            }
        }
        return rangyInitialized;
    }

    /**
     * Matches PHP backend expectations
     * @param {Range} selectionRange - The text selection range
     * @returns {Promise} - Promise resolving to {text, index, type}
     */
    async function getTextAndIndexAsync(selectionRange) {
        return new Promise((resolve, reject) => {
            if (!ensureRangyInitialized()) {
                reject(new Error('Rangy library not available'));
                return;
            }

            const baseEl = getMediaWikiContentRoot();
            if (!baseEl) {
                reject(new Error('MediaWiki content root not found for search.'));
                return;
            }
            const selectionPos = rangy.serializeRange(selectionRange);
            const searchFor = selectionRange.toString();
            const searchForHtml = selectionRange.toHtml();

            if (!searchFor && !searchForHtml) {
                reject(new Error('Selection is empty or contains no searchable content.'));
                return;
            }

            const range = rangy.createRange();
            const searchScopeRange = rangy.createRange();
            let i = 0; // Occurrence counter

            searchScopeRange.selectNodeContents(baseEl);
            const findOptions = {
                caseSensitive: true,
                withinRange: searchScopeRange
            };

            const asyncSearchHtml = () => {
                const content = getMediaWikiContentRoot();
                if (!content) {
                    reject(new Error('MediaWiki content root not found for HTML search.'));
                    return;
                }
                let currentNode;
                let currentText = searchFor; // Use plain text for character matching of HTML selection
                const iterator = document.createNodeIterator(content, NodeFilter.SHOW_TEXT);
                let foundOccurrences = -1;

                while ((currentNode = iterator.nextNode())) {
                    for (let charIndex = 0; charIndex < currentNode.data.length; charIndex++) {
                        if (currentNode.data[charIndex] === currentText[0]) {
                            currentText = currentText.substring(1);
                            if (currentText.length === 0) {
                                foundOccurrences++;
                                // Check if this occurrence corresponds to the actual selection
                                // This check might be complex if HTML structure differs significantly
                                // For now, we assume the first full match that ends where selection ends is the one.
                                if (currentNode.parentNode.contains(selectionRange.endContainer) &&
                                    (selectionRange.endOffset === 0 || charIndex + 1 >= selectionRange.endOffset || currentNode.data.length === charIndex + 1)) {
                                    resolve({
                                        text: searchForHtml, // Return the HTML version
                                        index: foundOccurrences,
                                        type: 'text' // Still considered text type for backend
                                    });
                                    return;
                                }
                                currentText = searchFor; // Reset for next potential match
                            }
                        } else {
                            currentText = searchFor; // Reset on mismatch
                        }
                    }
                }
                // If loop completes and no exact match found for the selection range
                reject(new Error('Selection not found in content (HTML search criteria failed).'));
            };

            const asyncSearch = () => {
                // Try to find the text
                if (range.findText(searchFor, findOptions)) {
                    // Check if the found range is the same as the original selection
                    if (rangy.serializeRange(range) === selectionPos) {
                        resolve({
                            text: searchFor,
                            index: i,
                            type: 'text'
                        });
                        return;
                    }
                    // If not the same, it's another occurrence. Increment count and search next.
                    range.collapse(false); // Collapse to the end of the found range
                    i++;
                    requestAnimationFrame(asyncSearch); // Continue searching
                } else {
                    // Text not found at or after the current position.
                    // This means the original selection was either not found, or we've passed all occurrences.
                    // If i > 0, it implies previous occurrences were found but didn't match selectionPos.
                    // This case (selection string exists but not at the selected DOM position) is problematic.
                    // The original code resolved with index:0 or i. This might be by design for some edge cases.
                    // However, it's safer to reject if the exact selection wasn't pinpointed.
                    reject(new Error(`Plain text selection \'${searchFor}\' not found at the specified document position. Occurrences found: ${i}.`));
                }
            };

            // Initial check for plain text search to see if text exists at all.
            const initialRangeForCheck = rangy.createRange();
            initialRangeForCheck.selectNodeContents(baseEl);
            const initialFindOptions = { caseSensitive: true, withinRange: initialRangeForCheck };

            if (/<[^>]*>/.test(searchForHtml)) {
                // Selection contains HTML tags
                asyncSearchHtml();
            } else {
                // Plain text selection
                if (!initialRangeForCheck.findText(searchFor, initialFindOptions)) {
                    reject(new Error(`Plain text selection \'${searchFor}\' not found anywhere in the content.`));
                    return;
                }
                // If text exists, start the precise search
                asyncSearch();
            }
        });
    }

    function applyTemporaryHighlight(range) {
        if (highlighter && range) {
            try {
                highlighter.highlightRanges(TEMP_HIGHLIGHT_CLASS, [range]);
            } catch (e) {
                console.error('Error applying temporary highlight:', e);
            }
        }
    }

    function clearTemporaryHighlight() {
        if (highlighter) {
            try {
                highlighter.removeAllHighlights();
            } catch (e) {
                console.error('Error clearing temporary highlight:', e);
            }
        }
    }

    /**
     * Process text selection with screenshot
     * @param {Event} event - Mouse event
     * @param {Object} selectionPosition - Position object to update
     * @param {Object} startPosition - Start position object to update
     * @returns {Promise} - Promise resolving to selection data with screenshot
     */
    async function processTextSelection(event, selectionPosition, startPosition, options = { captureScreenshot: false }) {
        if (!ensureRangyInitialized() || !isSelectionEnabled()) {
            return null;
        }
        const selection = rangy.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) {
            return null;
        }

        const range = selection.getRangeAt(0);
        const validationResult = validateSelectionContent(range);

        if (validationResult !== SELECTION_ENUMS.SELECTION_VALID) {
            // Show specific error message based on validation result
            let errorMessage = 'Invalid selection';
            switch (validationResult) {
                case SELECTION_ENUMS.INVALID_SELECTION_ALREADY_COMMENTED:
                    errorMessage = mw.msg('sic-selection-error-1');
                    break;
                case SELECTION_ENUMS.INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT:
                    errorMessage = mw.msg('sic-selection-error-2');
                    break;
                case SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS:
                    errorMessage = mw.msg('sic-selection-error-3');
                    break;
                case SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_HTML:
                    errorMessage = mw.msg('sic-selection-error-4');
                    break;
                case SELECTION_ENUMS.INVALID_SELECTION_IS_EMPTY:
                    errorMessage = mw.msg('sic-selection-error-5');
                    break;
                default:
                    errorMessage = 'Invalid selection';
            }

            mw.notify(errorMessage, { type: 'error' });
            console.warn('Invalid selection:', validationResult);
            return null;
        }

        let selectionData;
        try {
            selectionData = await getTextAndIndexAsync(range);
            selectionData.element = range.startContainer.parentElement || range.startContainer; // For parentId

            if (options.captureScreenshot) {
                applyTemporaryHighlight(range);
                try {
                    const screenshotDataUrl = await screenshotSelectionArea(selectionPosition, startPosition, selectionData.text);
                    selectionData.image = screenshotDataUrl;
                } catch (screenshotError) {
                    console.error('Error taking screenshot for text selection:', screenshotError);
                    selectionData.image = null; // Ensure image is null if screenshot fails
                } finally {
                    clearTemporaryHighlight();
                }
            }

            return selectionData;
        } catch (error) {
            console.error('Error processing text selection:', error);
            clearTemporaryHighlight();
            return null;
        }
    }

    return {
        processTextSelection,
        getTextAndIndexAsync,
        applyTemporaryHighlight,
        clearTemporaryHighlight,
        ensureRangyInitialized
    };
}

module.exports = { useTextSelection }; 