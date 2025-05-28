const { ref, reactive } = require('vue');
const {
    initializeRangy,
    validateSelectionContent,
    createImageHash,
    getMediaWikiContentRoot,
    isSelectionEnabled
} = require('../utils/selectionUtils.js');
const useScreenshot = require('./useScreenshot.js');

// Define SELECTION_ENUMS here as the source of truth
const SELECTION_ENUMS = {
    SELECTION_VALID: 0,
    INVALID_SELECTION_ALREADY_COMMENTED: 1,
    INVALID_SELECTION_INCLUDES_DYNAMIC_CONTENT: 2,
    INVALID_SELECTION_CONTAINS_LINEBREAKS: 3,
    INVALID_SELECTION_IS_EMPTY: 4,
    INVALID_SELECTION_CONTAINS_HTML: 5,
    UNKNOWN_ERROR: 99
};

function useSelection() {
    const isSelectionActive = ref(false);
    const currentSelection = ref(null);
    const lastRange = ref(null);
    const selectionPosition = reactive({ x: 0, y: 0 });
    const startPosition = reactive({ x: 0, y: 0 });
    const isCapturing = ref(false);

    // Initialize rangy on first use
    let rangyInitialized = false;
    let highlighter = null;
    const TEMP_HIGHLIGHT_CLASS = 'sc-highlight-temp';

    // Screenshot composable instance
    const { takeScreenshot, screenshotSelectionArea } = useScreenshot();

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
     * Validates the selection content
     * @param {*} wrappedSelection - rangy selection or HTML string
     * @returns {number} - validation result enum
     */
    function validateSelection(wrappedSelection) {
        return validateSelectionContent(wrappedSelection);
    }

    /**
     * Gets the MediaWiki content root element
     * @returns {Element} - The content root element
     */
    function getContentRoot() {
        return getMediaWikiContentRoot();
    }

    /**
     * Critical word index calculation - MUST match PHP backend expectations
     * This is the most important function - it replicates the original logic exactly
     * @param {Range} selectionRange - The text selection range
     * @returns {Promise} - Promise resolving to {text, index, type}
     */
    async function getTextAndIndexAsync(selectionRange) {
        return new Promise((resolve, reject) => {
            if (!ensureRangyInitialized()) {
                reject(new Error('Rangy library not available'));
                return;
            }

            const baseEl = getContentRoot();
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
                const content = getContentRoot();
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
     * @returns {Promise} - Promise resolving to selection data with screenshot
     */
    async function processTextSelection(event, options = { captureScreenshot: false }) {
        if (!ensureRangyInitialized() || !isSelectionEnabled()) {
            return null;
        }
        const selection = rangy.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) {
            clearSelection();
            return null;
        }

        const range = selection.getRangeAt(0);
        const validationResult = validateSelection(range);

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
            clearSelection();
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

            currentSelection.value = selectionData;
            lastRange.value = range.cloneRange();
            selectionPosition.x = event.clientX;
            selectionPosition.y = event.clientY;
            isSelectionActive.value = true;
            return selectionData;
        } catch (error) {
            console.error('Error processing text selection:', error);
            clearTemporaryHighlight();
            clearSelection();
            return null;
        }
    }

    /**
     * Process dynamic block selection
     * @param {Element} element - The dynamic block element
     * @returns {Object} - Selection data
     */
    async function processDynamicBlockSelection(element, event, options = { captureScreenshot: false }) {
        if (!isSelectionEnabled()) return null;

        const validationResult = validateSelection(element.outerHTML);
        if (validationResult !== SELECTION_ENUMS.SELECTION_VALID) {
            console.warn('Invalid dynamic block selection:', validationResult);
            return null;
        }

        // For sc-image-block elements, use the data-hash instead of full HTML
        let selectionText = element.outerHTML;
        if (element.classList.contains('sc-image-block') && element.dataset.hash) {
            selectionText = element.dataset.hash;
        }

        const selectionData = {
            text: selectionText,
            index: -1,
            type: 'dynamic_block',
            element: element
        };

        if (options.captureScreenshot) {
            try {
                const screenshotDataUrl = await takeScreenshot(element);
                selectionData.image = screenshotDataUrl;
            } catch (error) {
                console.error('Error taking screenshot for dynamic block:', error);
                selectionData.image = null;
            }
        }

        currentSelection.value = selectionData;
        const rect = element.getBoundingClientRect();
        selectionPosition.x = event ? event.clientX : (rect.left + rect.width / 2);
        selectionPosition.y = event ? event.clientY : (rect.top + rect.height / 2);
        isSelectionActive.value = true;
        return selectionData;
    }

    /**
     * Process image selection
     * @param {Element} imgElement - The image element
     * @returns {Object} - Selection data
     */
    async function processImageSelection(imgElement, event, options = { captureScreenshot: false }) {
        if (!isSelectionEnabled()) return null;

        const validationResult = validateSelection(imgElement.outerHTML);
        if (validationResult !== SELECTION_ENUMS.SELECTION_VALID && validationResult !== SELECTION_ENUMS.INVALID_SELECTION_CONTAINS_LINEBREAKS) { // Linebreaks might be ok for outerHTML
            console.warn('Invalid image selection:', validationResult);
            return null;
        }

        const imageHash = createImageHash(imgElement.src);

        const selectionData = {
            text: imgElement.alt || `Image: ${imageHash}`,
            index: -1,
            type: 'image',
            image_hash: imageHash,
            src: imgElement.src,
            element: imgElement
        };

        if (options.captureScreenshot) {
            try {
                const screenshotDataUrl = await takeScreenshot(imgElement);
                selectionData.image = screenshotDataUrl;
            } catch (error) {
                console.error('Error taking screenshot for image selection:', error);
                selectionData.image = null;
            }
        }

        currentSelection.value = selectionData;
        const rect = imgElement.getBoundingClientRect();
        selectionPosition.x = event ? event.clientX : (rect.left + rect.width / 2);
        selectionPosition.y = event ? event.clientY : (rect.top + rect.height / 2);
        isSelectionActive.value = true;
        return selectionData;
    }

    /**
     * Clear current selection
     */
    function clearSelection() {
        currentSelection.value = null;
        lastRange.value = null;
        isSelectionActive.value = false;
        isCapturing.value = false;

        // Clear browser selection
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }

        clearTemporaryHighlight(); // Ensure any temp highlights are cleared
    }

    /**
     * Format selection data for API request (replaces the functionality from old code)
     * @param {Object} selectionData - The selection data with screenshot
     * @returns {Object} - Formatted data for API request
     */
    function formatSelectionForAPI(selectionData) {
        if (!selectionData) {
            return null;
        }

        const root = getContentRoot();
        let parentId = null;
        if (selectionData.element) {
            const parentCommentElement = selectionData.element.closest('[data-comment-id]');
            if (parentCommentElement) {
                parentId = parentCommentElement.dataset.commentId;
            }
        }

        const formattedData = {
            text: selectionData.text || '',
            index: selectionData.index === undefined ? -1 : selectionData.index,
            type: selectionData.type || 'text',
            image: selectionData.image || null,
            parentId: parentId,
            src: selectionData.src,
            image_hash: selectionData.image_hash
        };

        // Add additional fields based on selection type
        if (selectionData.type === 'dynamic-block' && selectionData.element) {
            formattedData.elementData = {
                hash: selectionData.element.dataset.hash,
                type: selectionData.element.dataset.type
            };
        } else if (selectionData.type === 'image' && selectionData.element) {
            formattedData.elementData = {
                src: selectionData.element.src,
                width: selectionData.element.width,
                height: selectionData.element.height
            };
        }

        return formattedData;
    }

    /**
     * Set up image wrappers for selection (like the old ImageSelection.bindEvents)
     */
    function setupImageSelection() {
        const contentRoot = getContentRoot();
        if (!contentRoot) {
            console.error("Cannot setup image selection: content root not found.");
            return;
        }
        const images = contentRoot.querySelectorAll('img');

        images.forEach(img => {
            // Skip if already wrapped or if it's an image inside a comment display (e.g., a comment bubble showing an image)
            if ((img.parentElement && img.parentElement.classList.contains('sc-dynamic-block')) ||
                img.closest('.smartcomment-comment-view') ||
                img.closest('.sc-comment-component')) {
                return;
            }

            // Ensure image has a src, otherwise it might not be a meaningful image to comment on
            if (!img.src) {
                return;
            }

            const hash = createImageHash(img.src, img.width, img.height); // from selectionUtils
            const wrapper = document.createElement('div');
            wrapper.className = 'sc-dynamic-block sc-image-block';
            wrapper.dataset.hash = `img[${hash}]`;
            wrapper.dataset.type = 'image';

            if (img.parentNode) {
                img.parentNode.insertBefore(wrapper, img);
                wrapper.appendChild(img);
            } else {
                console.warn("Image has no parentNode, cannot wrap:", img);
            }
        });
    }

    return {
        // State
        isSelectionActive,
        currentSelection,
        lastRange,
        selectionPosition,
        startPosition,
        isCapturing,

        // Methods
        validateSelection,
        processTextSelection,
        processDynamicBlockSelection,
        processImageSelection,
        clearSelection,
        setupImageSelection,
        formatSelectionForAPI,
        screenshotSelectionArea,

        // Enums
        SELECTION_ENUMS,

        // Utility
        getContentRoot
    };
}

module.exports = { useSelection, SELECTION_ENUMS }; 