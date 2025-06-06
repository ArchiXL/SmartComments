/**
 * Main Selection Composable - Refactored
 * Uses Strategy pattern for different selection types
 * Eliminates duplication and provides unified interface
 */
const { ref, reactive } = require('vue');
const { selectionStrategyFactory } = require('../../factories/SelectionStrategyFactory.js');
const { getMediaWikiContentRoot } = require('./shared/SelectionUtils.js');
const { SELECTION_TIMEOUTS } = require('../../utils/constants.js');

function useSelection() {
    // State management
    const isSelectionActive = ref(false);
    const currentSelection = ref(null);
    const lastRange = ref(null);
    const selectionPosition = reactive({ x: 0, y: 0 });
    const startPosition = reactive({ x: 0, y: 0 });
    const isCapturing = ref(false);

    // Initialize factory
    selectionStrategyFactory.initialize();

    /**
     * Process any selection type using the appropriate strategy
     * @param {*} target - Selection target (range, element, etc.)
     * @param {Event} event - Interaction event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async function processSelection(target, event, options = {}) {
        if (isCapturing.value) {
            console.warn('Selection processing already in progress');
            return null;
        }

        isCapturing.value = true;

        try {
            // Use factory to process selection with appropriate strategy
            const selectionData = await selectionStrategyFactory.processSelection(target, event, options);

            if (selectionData) {
                // Update state
                currentSelection.value = selectionData;
                updateSelectionState(selectionData, event);
                isSelectionActive.value = true;
                return selectionData;
            }

            // Clear selection if processing failed
            clearSelection();
            return null;

        } finally {
            isCapturing.value = false;
        }
    }

    /**
     * Process text selection specifically
     * @param {Event} event - Mouse event  
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async function processTextSelection(event, options = {}) {
        // Add delay for text selection as per original behavior
        await new Promise(resolve => setTimeout(resolve, SELECTION_TIMEOUTS.TEXT_SELECTION_DELAY));

        if (!window.rangy || !rangy.getSelection) {
            console.error('Rangy library not available for text selection');
            return null;
        }

        const selection = rangy.getSelection();
        if (!selection.rangeCount || selection.isCollapsed) {
            return null;
        }

        const range = selection.getRangeAt(0);
        return await processSelection(range, event, options);
    }

    /**
     * Process dynamic block selection
     * @param {Element} element - Dynamic block element
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async function processDynamicBlockSelection(element, event, options = {}) {
        return await processSelection(element, event, options);
    }

    /**
     * Process image selection
     * @param {Element} imgElement - Image element
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async function processImageSelection(imgElement, event, options = {}) {
        return await processSelection(imgElement, event, options);
    }

    /**
     * Process SVG selection
     * @param {Element} svgElement - SVG element or child
     * @param {Event} event - Mouse event
     * @param {Object} options - Processing options
     * @returns {Promise<Object|null>} - Selection result
     */
    async function processSVGSelection(svgElement, event, options = {}) {
        return await processSelection(svgElement, event, options);
    }

    /**
     * Update selection state based on selection data and event
     * @param {Object} selectionData - Selection data
     * @param {Event} event - Interaction event
     */
    function updateSelectionState(selectionData, event) {
        // Store range for text selections
        if (selectionData.type === 'text' && window.rangy && rangy.getSelection) {
            const selection = rangy.getSelection();
            if (selection.rangeCount) {
                lastRange.value = selection.getRangeAt(0).cloneRange();
            }
        } else {
            lastRange.value = null;
        }

        // Update position from event or element
        if (event) {
            selectionPosition.x = event.clientX || event.pageX || 0;
            selectionPosition.y = event.clientY || event.pageY || 0;
        } else if (selectionData.element) {
            // Calculate position from element if no event
            const rect = selectionData.element.getBoundingClientRect();
            selectionPosition.x = rect.left + rect.width / 2;
            selectionPosition.y = rect.top + rect.height / 2;
        }
    }

    /**
     * Clear current selection and reset state
     */
    function clearSelection() {
        currentSelection.value = null;
        lastRange.value = null;
        isSelectionActive.value = false;
        isCapturing.value = false;

        // Clear browser selection
        if (window.getSelection) {
            try {
                window.getSelection().removeAllRanges();
            } catch (error) {
                console.warn('Failed to clear browser selection:', error);
            }
        }

        // Clear rangy selection
        if (window.rangy && rangy.getSelection) {
            try {
                rangy.getSelection().removeAllRanges();
            } catch (error) {
                console.warn('Failed to clear rangy selection:', error);
            }
        }
    }

    /**
     * Format selection data for API request
     * @param {Object} selectionData - Selection data
     * @returns {Object|null} - Formatted data for API
     */
    function formatSelectionForAPI(selectionData) {
        if (!selectionData) {
            return null;
        }


        const root = getMediaWikiContentRoot();
        let parentId = null;

        // Find parent comment if selection is within one
        if (selectionData.element) {
            const parentCommentElement = selectionData.element.closest('[data-comment-id]');
            if (parentCommentElement) {
                parentId = parentCommentElement.dataset.commentId;
            }
        }

        const formattedData = {
            text: selectionData.text || '',
            index: selectionData.index ?? -1,
            type: selectionData.type || 'text',
            image: selectionData.image || null,
            parentId: parentId,
            src: selectionData.src || null,
            imageHash: selectionData.imageHash || null,
            svgId: selectionData.svgId || null,
            svgHash: selectionData.svgHash || null,
            href: selectionData.href || null
        };

        // Add type-specific data
        switch (selectionData.type) {
            case 'dynamic-block':
                if (selectionData.element) {
                    formattedData.elementData = {
                        hash: selectionData.element.dataset.hash,
                        type: selectionData.element.dataset.type,
                        blockType: selectionData.blockType
                    };
                }
                break;

            case 'image':
                if (selectionData.metadata) {
                    formattedData.elementData = {
                        src: selectionData.src,
                        width: selectionData.metadata.width,
                        height: selectionData.metadata.height,
                        alt: selectionData.metadata.alt,
                        aspectRatio: selectionData.metadata.aspectRatio
                    };
                }
                break;

            case 'svg':
                formattedData.elementData = {
                    svgId: selectionData.svgId,
                    href: selectionData.href,
                    textContent: selectionData.textContent,
                    metadata: selectionData.metadata
                };
                break;

            case 'text':
                // Text selections may have additional range information
                if (lastRange.value) {
                    formattedData.elementData = {
                        hasRange: true,
                        rangeInfo: 'Available'
                    };
                }
                break;
        }

        return formattedData;
    }

    /**
     * Setup selection system (initialize strategies)
     */
    function setupSelection() {
        try {
            selectionStrategyFactory.setupStrategies();
        } catch (error) {
            console.error('Failed to setup selection system:', error);
        }
    }

    /**
     * Find SVG link element (delegated to SVG strategy)
     * @param {Element} element - Element to check
     * @returns {Element|null} - SVG link or null
     */
    function findSVGLink(element) {
        const svgStrategy = selectionStrategyFactory.getStrategy('svg');
        if (svgStrategy && typeof svgStrategy.findSVGLink === 'function') {
            return svgStrategy.findSVGLink(element);
        }
        return null;
    }

    /**
     * Setup image selection (delegated to image strategy)
     */
    function setupImageSelection() {
        const imageStrategy = selectionStrategyFactory.getStrategy('image');
        if (imageStrategy && typeof imageStrategy.setupImageSelection === 'function') {
            return imageStrategy.setupImageSelection();
        }
        console.warn('Image strategy not available for setup');
    }

    /**
     * Get selection statistics and performance info
     * @returns {Object} - Selection system statistics
     */
    function getSelectionStats() {
        return {
            factory: selectionStrategyFactory.getStatistics(),
            currentState: {
                isActive: isSelectionActive.value,
                isCapturing: isCapturing.value,
                hasSelection: currentSelection.value !== null,
                selectionType: currentSelection.value?.type || null
            },
            position: {
                selection: { ...selectionPosition },
                start: { ...startPosition }
            }
        };
    }

    /**
     * Validate if element can be selected
     * @param {Element} element - Element to validate
     * @returns {boolean} - Whether element can be selected
     */
    function canSelectElement(element) {
        const strategy = selectionStrategyFactory.getStrategyByElement(element);
        return strategy ? strategy.validateTarget(element) : false;
    }

    /**
     * Get appropriate strategy for element
     * @param {Element} element - Element to check
     * @returns {string|null} - Strategy type or null
     */
    function getElementSelectionType(element) {
        const strategy = selectionStrategyFactory.getStrategyByElement(element);
        return strategy ? strategy.getType() : null;
    }

    return {
        // State
        isSelectionActive,
        currentSelection,
        lastRange,
        selectionPosition,
        startPosition,
        isCapturing,

        // Core processing methods
        processSelection,
        processTextSelection,
        processDynamicBlockSelection,
        processImageSelection,
        processSVGSelection,

        // Utility methods
        clearSelection,
        formatSelectionForAPI,
        setupSelection,
        setupImageSelection,
        findSVGLink,

        // Information and validation
        getSelectionStats,
        canSelectElement,
        getElementSelectionType,

        // Legacy compatibility
        getMediaWikiContentRoot
    };
}

module.exports = { useSelection }; 