const { ref, reactive } = require('vue');
const { getMediaWikiContentRoot } = require('../../utils/selectionUtils.js');
const { useTextSelection } = require('./useTextSelection.js');
const { useDynamicBlockSelection } = require('./useDynamicBlockSelection.js');
const { useImageSelection } = require('./useImageSelection.js');
const useScreenshot = require('../useScreenshot.js');

function useSelection() {
    const isSelectionActive = ref(false);
    const currentSelection = ref(null);
    const lastRange = ref(null);
    const selectionPosition = reactive({ x: 0, y: 0 });
    const startPosition = reactive({ x: 0, y: 0 });
    const isCapturing = ref(false);

    // Initialize selection composables
    const textSelection = useTextSelection();
    const dynamicBlockSelection = useDynamicBlockSelection();
    const imageSelection = useImageSelection();
    const { screenshotSelectionArea } = useScreenshot();

    /**
     * Process text selection with screenshot
     * @param {Event} event - Mouse event
     * @returns {Promise} - Promise resolving to selection data with screenshot
     */
    async function processTextSelection(event, options = { captureScreenshot: false }) {
        const selectionData = await textSelection.processTextSelection(event, selectionPosition, startPosition, options);

        if (selectionData) {
            currentSelection.value = selectionData;
            // Store the range for text selections
            if (window.rangy && rangy.getSelection) {
                const selection = rangy.getSelection();
                if (selection.rangeCount) {
                    lastRange.value = selection.getRangeAt(0).cloneRange();
                }
            }
            selectionPosition.x = event.clientX;
            selectionPosition.y = event.clientY;
            isSelectionActive.value = true;
            return selectionData;
        }

        clearSelection();
        return null;
    }

    /**
     * Process dynamic block selection
     * @param {Element} element - The dynamic block element
     * @returns {Object} - Selection data
     */
    async function processDynamicBlockSelection(element, event, options = { captureScreenshot: false }) {
        const selectionData = await dynamicBlockSelection.processDynamicBlockSelection(element, event, options);

        if (selectionData) {
            currentSelection.value = selectionData;
            lastRange.value = null;
            const rect = element.getBoundingClientRect();
            selectionPosition.x = event ? event.clientX : (rect.left + rect.width / 2);
            selectionPosition.y = event ? event.clientY : (rect.top + rect.height / 2);
            isSelectionActive.value = true;
            return selectionData;
        }

        return null;
    }

    /**
     * Process image selection
     * @param {Element} imgElement - The image element
     * @returns {Object} - Selection data
     */
    async function processImageSelection(imgElement, event, options = { captureScreenshot: false }) {
        const selectionData = await imageSelection.processImageSelection(imgElement, event, options);

        if (selectionData) {
            currentSelection.value = selectionData;
            lastRange.value = null;
            const rect = imgElement.getBoundingClientRect();
            selectionPosition.x = event ? event.clientX : (rect.left + rect.width / 2);
            selectionPosition.y = event ? event.clientY : (rect.top + rect.height / 2);
            isSelectionActive.value = true;
            return selectionData;
        }

        return null;
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

        // Clear any temporary highlights
        if (textSelection.clearTemporaryHighlight) {
            textSelection.clearTemporaryHighlight();
        }
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

        const root = getMediaWikiContentRoot();
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
     * Set up image wrappers for selection (delegated to image selection composable)
     */
    function setupImageSelection() {
        return imageSelection.setupImageSelection();
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
        processTextSelection,
        processDynamicBlockSelection,
        processImageSelection,
        clearSelection,
        setupImageSelection,
        formatSelectionForAPI,
        screenshotSelectionArea,

        // Utility
        getMediaWikiContentRoot
    };
}

module.exports = { useSelection }; 