const { useSelection, SELECTION_ENUMS } = require('./useSelection.js');
const { useHighlight } = require('./useHighlight.js');
const useAppStateStore = require('../store/appStateStore.js');

function useSelectionEvents() {
    const selection = useSelection();
    const highlight = useHighlight();

    // Event handlers
    let mouseDownHandler, mouseUpHandler, mouseMoveHandler, clickHandler;
    let isEventsBound = false;

    /**
     * Handle mouse down events to track start position
     */
    function handleMouseDown(event) {
        if (!isSelectionEnabled()) return;

        selection.startPosition.x = event.pageX;
        selection.startPosition.y = event.pageY;
    }

    /**
     * Handle mouse move events to track current position
     */
    function handleMouseMove(event) {
        if (!isSelectionEnabled()) return;
        if (selection.isCapturing.value) return;

        selection.selectionPosition.x = event.pageX;
        selection.selectionPosition.y = event.pageY;
    }

    /**
     * Handle mouse up events for text selection
     */
    function handleMouseUp(event) {
        if (!isSelectionEnabled()) return;

        setTimeout(async () => {
            if (!rangy.getSelection().isCollapsed) {
                try {
                    // Call the consolidated function with screenshot option
                    const result = await selection.processTextSelection(event, { captureScreenshot: true });
                    if (result) {
                        await handleSuccessfulSelection(result, event);
                    }
                } catch (error) {
                    console.error('Text selection failed:', error);
                    showSelectionError(error);
                }
            }
        }, 1);
    }

    /**
     * Handle click events for dynamic blocks and images
     */
    async function handleClick(event) { // Made async to await selection processing
        if (!isSelectionEnabled()) return;

        const target = event.target;
        let selectionResult = null;

        // Handle dynamic block selection
        const dynamicBlock = target.closest('.sc-dynamic-block');
        if (dynamicBlock) {
            event.preventDefault();
            try {
                // Call the consolidated function with screenshot option
                selectionResult = await selection.processDynamicBlockSelection(dynamicBlock, event, { captureScreenshot: true });
            } catch (error) {
                console.error('Dynamic block selection failed:', error);
                showSelectionError(error);
            }
        }
        // Handle image selection (if not wrapped in dynamic block and not already handled)
        else if (target.tagName === 'IMG') {
            event.preventDefault();
            try {
                // Call the consolidated function with screenshot option
                selectionResult = await selection.processImageSelection(target, event, { captureScreenshot: true });
            } catch (error) {
                console.error('Image selection failed:', error);
                showSelectionError(error);
            }
        }

        if (selectionResult) {
            await handleSuccessfulSelection(selectionResult, event);
        }
    }

    /**
     * Handle successful selection by creating highlight and triggering events
     */
    async function handleSuccessfulSelection(selectionResult, event) {
        console.log('Selection successful:', selectionResult);

        // Create highlight based on selection type
        const highlightData = createHighlightData(selectionResult);

        // Add to highlights
        highlight.addHighlight(selectionResult.type, highlightData);

        // Format data for API usage
        const apiData = selection.formatSelectionForAPI(selectionResult);

        // Emit custom event for other components to handle
        const selectionEvent = new CustomEvent('smartcomments:selection', {
            detail: {
                selection: selectionResult,
                screenshot: selectionResult.screenshot || null, // Include screenshot data
                apiData: apiData, // Include API-ready formatted data
                position: {
                    x: event.pageX,
                    y: event.pageY
                },
                highlight: highlightData
            }
        });

        document.dispatchEvent(selectionEvent);
    }

    /**
     * Create highlight data from selection result
     */
    function createHighlightData(selectionResult) {
        return {
            data_id: generateTempId(), // Temporary ID until saved
            text: selectionResult.text,
            index: selectionResult.index,
            type: selectionResult.type,
            element: selectionResult.element || null,
            screenshot: selectionResult.screenshot || null, // Include screenshot in highlight data
            timestamp: Date.now()
        };
    }

    /**
     * Generate temporary ID for new selections
     */
    function generateTempId() {
        return 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Show selection error to user
     */
    function showSelectionError(error) {
        // You can customize this to show user-friendly error messages
        console.error('Selection error:', error);

        // Example error handling - customize based on your notification system
        if (typeof mw !== 'undefined' && mw.notify) {
            mw.notify('Selection error: ' + error.message, { type: 'error' });
        }
    }

    /**
     * Check if selection is enabled
     */
    function isSelectionEnabled() {
        const store = useAppStateStore();
        return store.isEnabled;
    }

    /**
     * Add hover effects for dynamic blocks
     */
    function setupDynamicBlockHover() {
        const contentRoot = selection.getContentRoot();

        // Use event delegation for better performance
        contentRoot.addEventListener('mouseover', (event) => {
            const dynamicBlock = event.target.closest('.sc-dynamic-block');
            if (dynamicBlock && !dynamicBlock.closest('.smartcomment-hl-')) {
                dynamicBlock.classList.add('sc-hover');
            }
        });

        contentRoot.addEventListener('mouseout', (event) => {
            const dynamicBlock = event.target.closest('.sc-dynamic-block');
            if (dynamicBlock) {
                dynamicBlock.classList.remove('sc-hover');
            }
        });
    }

    /**
     * Bind all selection events
     */
    function bindEvents() {
        if (isEventsBound) return;

        const contentRoot = selection.getContentRoot();

        // Create bound handlers
        mouseDownHandler = handleMouseDown.bind(null);
        mouseUpHandler = handleMouseUp.bind(null);
        mouseMoveHandler = handleMouseMove.bind(null);
        clickHandler = handleClick.bind(null);

        // Bind events
        document.addEventListener('mousedown', mouseDownHandler);
        contentRoot.addEventListener('mouseup', mouseUpHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        contentRoot.addEventListener('click', clickHandler);

        // Setup image selection wrappers
        selection.setupImageSelection();

        // Setup dynamic block hover effects
        setupDynamicBlockHover();

        isEventsBound = true;
        console.log('Selection events bound');
    }

    /**
     * Unbind all selection events
     */
    function unbindEvents() {
        if (!isEventsBound) return;

        document.removeEventListener('mousedown', mouseDownHandler);
        selection.getContentRoot().removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('mousemove', mouseMoveHandler);
        selection.getContentRoot().removeEventListener('click', clickHandler);

        isEventsBound = false;
        console.log('Selection events unbound');
    }

    /**
     * Handle selection creation (triggered by successful selection)
     */
    function onSelectionCreate(callback) {
        const handler = (event) => callback(event.detail);
        document.addEventListener('smartcomments:selection', handler);

        // Return cleanup function
        return () => document.removeEventListener('smartcomments:selection', handler);
    }

    return {
        // State from selection composable
        isSelectionActive: selection.isSelectionActive,
        currentSelection: selection.currentSelection,
        selectionPosition: selection.selectionPosition,
        startPosition: selection.startPosition,
        isCapturing: selection.isCapturing,
        selectionImage: selection.selectionImage,

        // Methods
        bindEvents,
        unbindEvents,
        onSelectionCreate,
        isSelectionEnabled,
        clearSelection: selection.clearSelection,

        // Selection processing methods
        processTextSelection: selection.processTextSelection,
        processTextSelectionWithScreenshot: selection.processTextSelectionWithScreenshot,
        processDynamicBlockSelection: selection.processDynamicBlockSelection,
        processDynamicBlockSelectionWithScreenshot: selection.processDynamicBlockSelectionWithScreenshot,
        processImageSelection: selection.processImageSelection,
        processImageSelectionWithScreenshot: selection.processImageSelectionWithScreenshot,

        // Formatting methods
        formatSelectionForAPI: selection.formatSelectionForAPI,

        // Screenshot methods
        screenshot: selection.screenshot,
        screenshotSelection: selection.screenshotSelection,

        // Validation
        validateSelection: selection.validateSelection,
        SELECTION_ENUMS
    };
}

module.exports = { useSelectionEvents }; 